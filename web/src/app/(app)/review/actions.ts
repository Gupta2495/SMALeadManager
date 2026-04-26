"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { adminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";

type Result = ActionResult;

export async function promoteFromReviewAction(leadId: string): Promise<Result> {
  await getCurrentProfile(); // verify authenticated

  const { data, error } = await adminClient()
    .from("leads")
    .update({ needs_review: false })
    .eq("id", leadId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Lead not found or update was blocked." };
  }

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/review");
  return { ok: true };
}

export async function discardFromReviewAction(leadId: string): Promise<Result> {
  await getCurrentProfile(); // verify authenticated

  const { error } = await adminClient()
    .from("leads")
    .delete()
    .eq("id", leadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/review");
  return { ok: true };
}
