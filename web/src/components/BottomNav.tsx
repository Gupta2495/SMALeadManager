"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, List, ShieldAlert, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  reviewCount?: number;
};

export function BottomNav({ reviewCount = 0 }: Props) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <nav className="bottom-tabs" aria-label="Main mobile">
      <Link href="/" className={cn("bottom-tab", isActive("/") && "active")}>
        <Home aria-hidden />
        <span>Today</span>
      </Link>
      <Link href="/leads" className={cn("bottom-tab", isActive("/leads") && "active")}>
        <List aria-hidden />
        <span>Leads</span>
      </Link>
      <Link href="/review" className={cn("bottom-tab", isActive("/review") && "active")}>
        <span className="bottom-tab-icon">
          <ShieldAlert aria-hidden />
          {reviewCount > 0 ? <span className="bottom-tab-badge">{reviewCount}</span> : null}
        </span>
        <span>Review</span>
      </Link>
      <Link href="/analytics" className={cn("bottom-tab", isActive("/analytics") && "active")}>
        <BarChart3 aria-hidden />
        <span>Analytics</span>
      </Link>
      <Link href="/profile" className={cn("bottom-tab", isActive("/profile") && "active")}>
        <User aria-hidden />
        <span>Profile</span>
      </Link>
    </nav>
  );
}
