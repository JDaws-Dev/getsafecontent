"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, BookOpen, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/play/home", icon: Home, label: "Home", emoji: "\uD83C\uDFE0" },
  { href: "/play/search", icon: Search, label: "Explore", emoji: "\uD83D\uDD0D" },
  { href: "/play/home", icon: BookOpen, label: "My Books", emoji: "\uD83D\uDCDA" },
];

export function KidNav() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem("safereads_kid_profile");
    localStorage.removeItem("safereads_family_code");
    window.location.href = "/play";
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-purple-100 bg-white/95 backdrop-blur-md safe-area-bottom">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.label === "My Books" && pathname === "/play/home") ||
            (item.label === "Explore" && pathname?.startsWith("/play/search"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`kid-touch flex flex-col items-center gap-0.5 rounded-2xl px-5 py-2 transition-all duration-200 ${
                isActive
                  ? "bg-purple-50 text-purple-600"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-transform duration-200 ${isActive ? "scale-110" : ""}`}
                strokeWidth={isActive ? 2.5 : 1.8}
              />
              <span className={`text-[10px] font-semibold ${isActive ? "text-purple-600" : ""}`}>
                {item.label}
              </span>
              {isActive && <div className="nav-active-dot" />}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="kid-touch flex flex-col items-center gap-0.5 rounded-2xl px-5 py-2 text-gray-400 transition-all duration-200 hover:text-gray-600"
        >
          <LogOut className="h-6 w-6" strokeWidth={1.8} />
          <span className="text-[10px] font-semibold">Exit</span>
        </button>
      </div>
    </nav>
  );
}
