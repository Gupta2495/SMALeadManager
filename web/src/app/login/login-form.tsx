"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  next,
  initialError,
}: {
  next?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>(initialError);

  function onSubmit(form: FormData) {
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    setError(undefined);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      const redirectTo = next && next.startsWith("/") ? next : "/";
      router.replace(redirectTo);
      router.refresh();
    });
  }

  return (
    <form action={onSubmit} className="mt-5 flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-zinc-700">Password</span>
        <input
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
