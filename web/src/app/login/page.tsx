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
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">
          Shree Madhav Lead Tracker
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Sign in with your admissions account.
        </p>
        <LoginForm next={next} initialError={error} />
      </div>
    </main>
  );
}
