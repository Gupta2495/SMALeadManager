import { AppShell } from "@/components/AppShell";
import { getCurrentProfile } from "@/lib/supabase/profile";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user, profile } = await getCurrentProfile();

  let reviewCount = 0;
  if (profile?.role === "admin") {
    const { count } = await supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("needs_review", true);
    reviewCount = count ?? 0;
  }

  return (
    <AppShell
      userEmail={user.email ?? null}
      role={profile?.role ?? "caller"}
      reviewCount={reviewCount}
    >
      {children}
    </AppShell>
  );
}
