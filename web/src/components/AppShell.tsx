import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";
import type { Role } from "@/lib/types";

type Props = {
  userEmail: string | null;
  role: Role;
  reviewCount?: number;
  children: React.ReactNode;
};

export function AppShell({ userEmail, role, reviewCount, children }: Props) {
  return (
    <div className="app">
      <TopNav userEmail={userEmail} role={role} reviewCount={reviewCount} />
      <div className="page">{children}</div>
      <BottomNav />
    </div>
  );
}
