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
    <nav className="border-b border-brand-cream-2 bg-brand-cream/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-2 sm:px-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "border-accent-600 text-brand-navy"
                  : "border-transparent text-ink-600 hover:text-brand-navy"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
