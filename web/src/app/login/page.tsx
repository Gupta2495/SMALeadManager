import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Shree Madhav Lead Tracker" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { next, error } = await searchParams;

  if (data.user) {
    redirect(next && next.startsWith("/") ? next : "/");
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-mark">SMA</div>
        <h1>Madhav Leads</h1>
        <p>Admissions lead tracker for Shree Madhav Academy.</p>
        <LoginForm next={next} initialError={error} />
        <div className="foot">
          Trouble signing in? Ask the admin to reset your password from the
          Supabase dashboard.
        </div>
      </div>
    </main>
  );
}
