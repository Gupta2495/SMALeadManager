"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { normalizePhone } from "@/lib/phoneFormat";

type Result = { ok: true } | { ok: false; error: string };

export async function editLeadAction(
  leadId: string,
  formData: FormData,
): Promise<Result> {
  const { supabase } = await getCurrentProfile();

  const rawPhone = String(formData.get("phone") ?? "").trim();

  let phone: string;
  if (!rawPhone || rawPhone.startsWith("NOPHONE-")) {
    // keep existing placeholder — caller didn't supply a real number yet
    const { data: existing } = await supabase
      .from("leads")
      .select("phone")
      .eq("id", leadId)
      .single();
    phone = existing?.phone ?? rawPhone;
  } else {
    const result = normalizePhone(rawPhone);
    if (!result.valid) {
      return { ok: false, error: "Enter a valid Indian phone number." };
    }
    phone = result.normalized;
  }

  const payload = {
    phone,
    student_name: String(formData.get("student_name") ?? "").trim() || null,
    parent_name: String(formData.get("parent_name") ?? "").trim() || null,
    class_label: String(formData.get("class_label") ?? "").trim() || null,
    interest: String(formData.get("interest") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim(),
  };

  const { error } = await supabase
    .from("leads")
    .update(payload)
    .eq("id", leadId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another lead already uses this phone number." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/");
  return { ok: true };
}
