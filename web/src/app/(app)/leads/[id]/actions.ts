"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import type { CallOutcome, LeadStatus } from "@/lib/types";

type Result<T = Record<string, never>> = ({ ok: true } & T) | { ok: false; error: string };

export async function updateStatusAction(
  leadId: string,
  status: LeadStatus,
): Promise<Result> {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true };
}

type LogCallInput = {
  leadId: string;
  outcome: CallOutcome;
  notes: string;
  nextFollowUp: string | null; // ISO string or null
  closeAs?: LeadStatus | null;
};

/**
 * Inserts an interaction row and patches the parent lead's rollup fields
 * (next_follow_up, last_contact_at, last_outcome, follow_up_count, status).
 * Matches the Python ingester's behavior so both systems converge on the
 * same lead state.
 */
export async function logCallAction(input: LogCallInput): Promise<Result> {
  const { supabase, user } = await getCurrentProfile();
  const nowIso = new Date().toISOString();

  const { data: existing, error: readErr } = await supabase
    .from("leads")
    .select("follow_up_count, status")
    .eq("id", input.leadId)
    .single<{ follow_up_count: number; status: LeadStatus }>();
  if (readErr || !existing) {
    return { ok: false, error: readErr?.message ?? "Lead not found" };
  }

  const { error: insertErr } = await supabase.from("interactions").insert({
    lead_id: input.leadId,
    type: "call",
    outcome: input.outcome,
    channel: "call",
    notes: input.notes || null,
    next_follow_up: input.nextFollowUp,
    created_by: user.id,
  });
  if (insertErr) return { ok: false, error: insertErr.message };

  const patch: Record<string, unknown> = {
    last_contact_at: nowIso,
    last_outcome: input.outcome,
    follow_up_count: existing.follow_up_count + 1,
    next_follow_up: input.nextFollowUp,
  };
  if (input.closeAs) patch.status = input.closeAs;
  else if (existing.status === "new") patch.status = "contacted";

  const { error: updateErr } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", input.leadId);
  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath(`/leads/${input.leadId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function closeLeadAction(
  leadId: string,
  closeAs: "admitted" | "lost" | "on_hold" | "rejected",
): Promise<Result> {
  const { supabase } = await getCurrentProfile();
  const { error } = await supabase
    .from("leads")
    .update({ status: closeAs, next_follow_up: null })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/");
  return { ok: true };
}
