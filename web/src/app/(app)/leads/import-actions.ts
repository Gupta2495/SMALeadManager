"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { adminClient } from "@/lib/supabase/admin";
import { normalizePhone } from "@/lib/phoneFormat";

type SkippedEntry = { index: number; reason: string };

type ImportResult =
  | { ok: true; imported: number; skipped: SkippedEntry[] }
  | { ok: false; error: string };

interface RawLead {
  student_name?: string | null;
  parent_name?: string | null;
  phone?: string | null;
  class_label?: string | null;
  location?: string | null;
  notes?: string | null;
  source_from?: string | null;
  source_date?: string | null;
}

// Dedupe key: a lead is "the same" if phone + student + parent all match
// (case-insensitive, whitespace-trimmed). Multiple leads can share a phone
// (siblings), so phone alone isn't enough. NOPHONE-xxx rows always have a
// unique uuid in the phone column, so we collapse all of them to "NOPHONE"
// and rely on the names to distinguish.
function dedupeKey(phone: string, student: string | null, parent: string | null): string {
  const s = (student ?? "").trim().toLowerCase();
  const p = (parent ?? "").trim().toLowerCase();
  const phoneKey = phone.startsWith("NOPHONE-") ? "NOPHONE" : phone;
  return `${phoneKey}|${s}|${p}`;
}

export async function importWhatsAppLeadsAction(
  jsonString: string,
): Promise<ImportResult> {
  try {
    return await _importWhatsAppLeads(jsonString);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Server error: ${msg}` };
  }
}

async function _importWhatsAppLeads(jsonString: string): Promise<ImportResult> {
  // Verify authentication first; the actual insert uses the service-role
  // client because it needs admin-level access.
  await getCurrentProfile();
  const supabase = adminClient();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, error: "Invalid JSON — could not parse the pasted text." };
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Expected a JSON array at the top level." };
  }

  if (parsed.length === 0) {
    return { ok: false, error: "The JSON array is empty." };
  }

  // Load existing leads (only the columns needed for dedupe) so we can skip
  // rows that already exist. Re-imports of overlapping date ranges should
  // be a no-op, not duplicate the data.
  const { data: existing, error: fetchErr } = await supabase
    .from("leads")
    .select("phone, student_name, parent_name");

  if (fetchErr) {
    return { ok: false, error: `Failed to load existing leads for dedupe: ${fetchErr.message}` };
  }

  const seen = new Set<string>();
  for (const e of existing ?? []) {
    seen.add(dedupeKey(e.phone, e.student_name, e.parent_name));
  }

  const now = new Date().toISOString();
  const rows: object[] = [];
  const skipped: SkippedEntry[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const raw = parsed[i] as RawLead;

    let phone: string;
    const rawPhone = String(raw.phone ?? "").trim();
    if (!rawPhone) {
      phone = "NOPHONE-" + crypto.randomUUID();
    } else {
      const normalized = normalizePhone(rawPhone);
      phone = normalized.valid ? normalized.normalized : "NOPHONE-" + crypto.randomUUID();
    }

    const student_name = raw.student_name?.trim() || null;
    const parent_name = raw.parent_name?.trim() || null;

    // Skip duplicates (against DB and against earlier rows in this batch).
    const key = dedupeKey(phone, student_name, parent_name);
    if (seen.has(key)) {
      skipped.push({ index: i, reason: "Duplicate of an existing lead" });
      continue;
    }
    seen.add(key);

    let source_msg_date: string | null = null;
    if (raw.source_date) {
      const d = new Date(String(raw.source_date).trim() + "T00:00:00+05:30");
      if (!Number.isNaN(d.getTime())) {
        source_msg_date = d.toISOString();
      }
    }

    rows.push({
      phone,
      student_name,
      parent_name,
      class_label: raw.class_label?.trim() || null,
      location: raw.location?.trim() || null,
      notes: raw.notes?.trim() || null,
      source_from: raw.source_from?.trim() || "bulk_import",
      source_msg_date,
      status: "new",
      assigned_to: null,  // Leave unassigned so all callers can see and claim them
      captured_at: now,
      confidence: 0.8,
      needs_review: true,
    });
  }

  if (rows.length === 0) {
    return {
      ok: false,
      error: `Nothing to import — all ${parsed.length} entries were duplicates of existing leads.`,
    };
  }

  // Use .select() so PostgREST actually returns the inserted rows — this
  // surfaces silent failures (e.g. RLS or auth misconfig) that would
  // otherwise return null error and zero rows.
  const { data: inserted, error: bulkError } = await supabase
    .from("leads")
    .insert(rows)
    .select("id");

  if (!bulkError && inserted && inserted.length === rows.length) {
    revalidatePath("/");
    revalidatePath("/leads");
    revalidatePath("/review");
    return { ok: true, imported: inserted.length, skipped };
  }

  // Bulk failed (or returned partial) — fall back to per-row inserts so we
  // can pinpoint which rows are bad and still save the good ones.
  let imported = 0;
  for (let i = 0; i < rows.length; i++) {
    const { data, error } = await supabase
      .from("leads")
      .insert(rows[i])
      .select("id")
      .single();
    if (error) {
      skipped.push({ index: i, reason: error.message });
    } else if (!data) {
      skipped.push({ index: i, reason: "Insert returned no row (likely auth/RLS issue)." });
    } else {
      imported++;
    }
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/review");

  if (imported === 0) {
    const reason = skipped[0]?.reason ?? bulkError?.message ?? "unknown";
    return { ok: false, error: `All leads failed to import. First error: ${reason}` };
  }

  return { ok: true, imported, skipped };
}
