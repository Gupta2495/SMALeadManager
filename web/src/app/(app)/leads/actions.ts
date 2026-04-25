"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";

type Result = { ok: true } | { ok: false; error: string };

export async function deleteLeadAction(leadId: string): Promise<Result> {
  const { supabase, user } = await getCurrentProfile();
  const { error } = await supabase.from("leads").delete().eq("id", leadId).eq("assigned_to", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/review");
  return { ok: true };
}
