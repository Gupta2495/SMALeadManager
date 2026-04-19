"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Home, List, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
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
