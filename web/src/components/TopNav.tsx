"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LayoutDashboard, List, ShieldAlert, User } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

type Props = {
  userEmail: string | null;
  role: Role;
  reviewCount?: number;
};

export function TopNav({ userEmail, role, reviewCount = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function onSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="topnav">
      <Link href="/" className="brand">
        <span className="brand-mark">SMA</span>
        <span className="flex flex-col leading-tight">
          <span>Madhav Leads</span>
          <span className="brand-sub">Shree Madhav Academy</span>
        </span>
      </Link>

      <nav className="nav-links" aria-label="Main">
        <Link href="/" className={cn("nav-link", isActive("/") && "active")}>
          <LayoutDashboard size={16} aria-hidden /> Today
        </Link>
        <Link href="/leads" className={cn("nav-link", isActive("/leads") && "active")}>
          <List size={16} aria-hidden /> All leads
        </Link>
        <Link href="/analytics" className={cn("nav-link", isActive("/analytics") && "active")}>
          <BarChart3 size={16} aria-hidden /> Analytics
        </Link>
        {role === "admin" ? (
          <Link href="/review" className={cn("nav-link", isActive("/review") && "active")}>
            <ShieldAlert size={16} aria-hidden /> Review
            {reviewCount > 0 ? <span className="count-pill">{reviewCount}</span> : null}
          </Link>
        ) : null}
      </nav>

      <div className="nav-spacer" />

      <button type="button" className="user-menu" onClick={onSignOut} disabled={signingOut}>
        <span className="user-avatar">
          <User size={14} aria-hidden />
        </span>
        <span className="max-w-[160px] truncate">
          {signingOut ? "Signing out…" : userEmail ?? "Guest"}
        </span>
      </button>
    </header>
  );
}
