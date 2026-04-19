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
    <form action={onSubmit}>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          required
          autoComplete="email"
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          required
          autoComplete="current-password"
          className="input"
        />
      </div>
      {error ? <p role="alert" className="form-error">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-lg btn-block"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
