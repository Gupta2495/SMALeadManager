"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, List, ShieldAlert, User } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  userEmail: string | null;
  reviewCount?: number;
};

export function TopNav({ userEmail, reviewCount = 0 }: Props) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

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
        <Link href="/review" className={cn("nav-link", isActive("/review") && "active")}>
          <ShieldAlert size={16} aria-hidden /> Review
          {reviewCount > 0 ? <span className="count-pill">{reviewCount}</span> : null}
        </Link>
      </nav>

      <div className="nav-spacer" />

      <Link
        href="/profile"
        className={cn("user-menu", isActive("/profile") && "active")}
        aria-label="Profile"
      >
        <span className="user-avatar">
          <User size={14} aria-hidden />
        </span>
        <span className="max-w-[160px] truncate">{userEmail ?? "Guest"}</span>
      </Link>
    </header>
  );
}
