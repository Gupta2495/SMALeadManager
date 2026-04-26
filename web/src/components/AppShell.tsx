import { BottomNav } from "./BottomNav";
import { TopNav } from "./TopNav";

type Props = {
  userEmail: string | null;
  reviewCount?: number;
  children: React.ReactNode;
};

export function AppShell({ userEmail, reviewCount, children }: Props) {
  return (
    <div className="app">
      <TopNav userEmail={userEmail} reviewCount={reviewCount} />
      <div className="page">{children}</div>
      <BottomNav reviewCount={reviewCount} />
    </div>
  );
}
