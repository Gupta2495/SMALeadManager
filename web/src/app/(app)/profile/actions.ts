"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { adminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

interface CreateUserInput {
  email: string;
  password: string;
  fullName: string;
  role: Role;
}

export async function createUserAction(input: CreateUserInput): Promise<Result> {
  // Only admins can create users.
  const { profile } = await getCurrentProfile();
  if (profile?.role !== "admin") {
    return { ok: false, error: "Only admins can create users." };
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName.trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 6) {
    return { ok: false, error: "Password must be at least 6 characters." };
  }
  if (input.role !== "admin" && input.role !== "caller") {
    return { ok: false, error: "Role must be admin or caller." };
  }

  const admin = adminClient();

  // Create the auth user. email_confirm: true skips the verification email
  // since admins are creating accounts directly. The handle_new_user trigger
  // creates a matching profile row with role='caller' by default.
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });

  if (error) return { ok: false, error: error.message };
  if (!data.user) return { ok: false, error: "User creation returned no user." };

  // If the requested role is admin, promote after creation. Also patch the
  // email/full_name on the profile in case the trigger missed them.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      role: input.role,
      email,
      full_name: fullName || null,
    })
    .eq("id", data.user.id);

  if (updateErr) {
    return { ok: false, error: `User created but profile update failed: ${updateErr.message}` };
  }

  revalidatePath("/profile");
  return { ok: true };
}
