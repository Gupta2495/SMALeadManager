"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { normalizePhone } from "@/lib/phoneFormat";

type Result = { ok: true; leadId: string } | { ok: false; error: string };

export async function createLeadAction(formData: FormData): Promise<Result> {
  const { supabase, user } = await getCurrentProfile();

  const rawPhone = String(formData.get("phone") ?? "");
  const phone = normalizePhone(rawPhone);
  if (!phone.valid) {
    return { ok: false, error: "Enter a valid Indian phone number." };
  }

  const student_name = String(formData.get("student_name") ?? "").trim();
  if (!student_name) return { ok: false, error: "Student name is required." };

  const sourceMsgDateRaw = String(formData.get("source_msg_date") ?? "").trim();
  let source_msg_date: string | null = null;
  if (sourceMsgDateRaw) {
    // date input has no timezone; treat as IST midnight so it's stored correctly as UTC
    const parsed = new Date(sourceMsgDateRaw + "T00:00:00+05:30");
    if (Number.isNaN(parsed.getTime())) {
      return { ok: false, error: "Enter a valid source date." };
    }
    source_msg_date = parsed.toISOString();
  }

  const payload = {
    phone: phone.normalized,
    student_name,
    parent_name: String(formData.get("parent_name") ?? "").trim() || null,
    class_label: String(formData.get("class_label") ?? "").trim() || null,
    interest: String(formData.get("interest") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    source_msg_date,
    notes: String(formData.get("notes") ?? "").trim(),
    status: "new" as const,
    assigned_to: user.id,
    captured_at: new Date().toISOString(),
    confidence: 1, // manually entered
  };

  const { data, error } = await supabase
    .from("leads")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Could not save this lead because the database still has a unique-number constraint.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/leads");
  return { ok: true, leadId: data.id as string };
}
