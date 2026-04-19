import { redirect } from "next/navigation";
import { createClient } from "./server";
import type { Profile } from "@/lib/types";

/**
 * Fetches the signed-in user + their profiles row. Redirects to /login if
 * the session is missing (middleware usually catches this first, but a
 * defensive check keeps server components simple).
 */
export async function getCurrentProfile() {
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
}
