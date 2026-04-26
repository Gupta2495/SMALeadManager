"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { adminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

export async function deleteLeadAction(leadId: string): Promise<Result> {
  await getCurrentProfile(); // verify authenticated; redirects to /login otherwise

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
