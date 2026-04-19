import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">Shree Madhav Lead Tracker</h1>
      <p className="text-sm text-zinc-600">
        Signed in as <span className="font-medium">{user?.email}</span>.
      </p>
      <p className="text-sm text-zinc-500">
        Dashboard comes online in the next phase.
      </p>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
