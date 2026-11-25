"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, Users, MessageCircle, Settings } from "lucide-react";

// The dashboard's own section navigation, shown when SafeReads is embedded in
// the hub dashboard. The hub shell owns the logo, family code, cross-app
// switcher and sign-out; these tabs are the app.
const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/kids", label: "Kids", icon: Users },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function EmbeddedNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm" aria-label="SafeReads sections">
      <div className="mx-auto flex max-w-5xl items-center overflow-x-auto px-2 [scrollbar-width:none] sm:px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={`inline-flex h-11 items-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-accent-600 text-accent-600"
                  : "border-transparent text-brand-navy/60 hover:text-brand-navy"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
