import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Profile } from "@/lib/types";

// cache() deduplicates calls within the same React render tree, so layout +
// page both calling this only hits Supabase once per request.
export const getCurrentProfile = cache(async function getCurrentProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  return { supabase, user, profile };
});
