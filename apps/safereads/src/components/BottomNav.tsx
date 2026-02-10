"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth } from "convex/react";
import { Home, Search, Users, MessageCircle, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/search", label: "Search", icon: Search },
  { href: "/dashboard/kids", label: "Kids", icon: Users },
  { href: "/dashboard/chat", label: "Chat", icon: MessageCircle },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-parchment-200 bg-parchment-50 sm:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
                isActive ? "text-parchment-700" : "text-ink-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
