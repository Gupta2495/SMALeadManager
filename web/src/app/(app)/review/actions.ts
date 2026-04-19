"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";

type Result = { ok: true } | { ok: false; error: string };

async function assertAdmin() {
  const ctx = await getCurrentProfile();
  if (ctx.profile?.role !== "admin") {
    throw new Error("Admin only");
  }
  return ctx;
}

export async function promoteFromReviewAction(leadId: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase
    .from("leads")
    .update({ needs_review: false })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/review");
  return { ok: true };
}

export async function discardFromReviewAction(leadId: string): Promise<Result> {
  const { supabase } = await assertAdmin();
  const { error } = await supabase.from("leads").delete().eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/review");
  return { ok: true };
}
