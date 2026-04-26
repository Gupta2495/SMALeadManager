import { AppShell } from "@/components/AppShell";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await getCurrentProfile();

  const { count } = await supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("needs_review", true);
  const reviewCount = count ?? 0;

  return (
    <AppShell
      userEmail={user.email ?? null}
      reviewCount={reviewCount}
    >
      {children}
    </AppShell>
  );
}
