import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after password-recovery / email-confirm flows with
// a ?code param. Exchange it for a session, then forward to the app.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  const redirectTo = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
