"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Search, BookMarked, LogOut, Users, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";

const COLOR_GRADIENTS: Record<string, { bg: string; text: string; dot: string }> = {
  red: { bg: "bg-red-50", text: "text-red-600", dot: "from-red-500 to-rose-500" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", dot: "from-blue-500 to-indigo-500" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "from-emerald-500 to-teal-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", dot: "from-purple-500 to-violet-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", dot: "from-orange-500 to-amber-500" },
  pink: { bg: "bg-pink-50", text: "text-pink-600", dot: "from-pink-500 to-rose-500" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", dot: "from-teal-500 to-cyan-500" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600", dot: "from-yellow-500 to-amber-500" },
};

interface KidProfile {
  _id: string;
  name: string;
  color: string;
}

export function KidNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [kidProfile, setKidProfile] = useState<KidProfile | null>(null);

  useEffect(() => {
    const data = localStorage.getItem("safereads_kid_profile");
    if (data) {
      try { setKidProfile(JSON.parse(data)); } catch { /* ignore */ }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("safereads_kid_profile");
    localStorage.removeItem("safereads_family_code");
    window.location.href = "/read";
  };

  const handleSwitchProfile = () => {
    localStorage.removeItem("safereads_kid_profile");
    router.push("/read");
  };

  const colors = COLOR_GRADIENTS[kidProfile?.color || "purple"] || COLOR_GRADIENTS.purple;

  const NAV_ITEMS = [
    { href: "/read/home", icon: Home, label: "Home", match: (p: string) => p === "/read/home" },
    { href: "/read/search", icon: Search, label: "Explore", match: (p: string) => p?.startsWith("/read/search") || false },
    { href: "/read/bible", icon: BookOpen, label: "Bible", match: (p: string) => p?.startsWith("/read/bible") || false },
    { href: "/read/home#bookshelf", icon: BookMarked, label: "My Books", match: () => false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/98 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-1 py-1 sm:px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.match(pathname || "");
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`kid-touch flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 transition-all duration-200 sm:px-5 ${
                isActive
                  ? `${colors.bg} ${colors.text}`
                  : "text-gray-400 hover:text-gray-600 active:scale-95"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-[22px] w-[22px] transition-all duration-200 ${isActive ? "scale-110" : ""}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                {isActive && (
                  <div
                    className={`absolute -bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r ${colors.dot}`}
                  />
                )}
              </div>
              <span className={`mt-0.5 text-[10px] font-bold ${isActive ? colors.text : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Switch Profile button */}
        <button
          onClick={handleSwitchProfile}
          className="kid-touch flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-gray-400 transition-all duration-200 hover:text-gray-600 active:scale-95 sm:px-5"
        >
          <Users className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="mt-0.5 text-[10px] font-bold">Switch</span>
        </button>

        {/* Exit button */}
        <button
          onClick={handleLogout}
          className="kid-touch flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-gray-400 transition-all duration-200 hover:text-gray-600 active:scale-95 sm:px-5"
        >
          <LogOut className="h-[22px] w-[22px]" strokeWidth={1.8} />
          <span className="mt-0.5 text-[10px] font-bold">Exit</span>
        </button>
      </div>
    </nav>
  );
}
