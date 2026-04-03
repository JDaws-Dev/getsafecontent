"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/play/home", icon: Home, label: "Home" },
  { href: "/play/search", icon: Search, label: "Search" },
  { href: "/play/home", icon: BookOpen, label: "My Books" },
];

export function KidNav() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("safereads_kid_profile");
    localStorage.removeItem("safereads_family_code");
    window.location.href = "/play";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-200 bg-white/95 backdrop-blur-sm safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.label === "My Books" && pathname === "/play/home");
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 transition-colors ${
                isActive
                  ? "text-emerald-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-gray-400 transition-colors hover:text-gray-600"
        >
          <LogOut className="h-6 w-6" strokeWidth={2} />
          <span className="text-[10px] font-medium">Exit</span>
        </button>
      </div>
    </nav>
  );
}
