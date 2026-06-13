"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Library, BookMarked, LogOut, Users, BookOpen, LayoutGrid, X } from "lucide-react";
import { useEffect, useState } from "react";
import SafeFamilySwitcher from "@/components/SafeFamilySwitcher";

const COLOR_GRADIENTS: Record<string, { bg: string; text: string; dot: string; gradient: string; border: string }> = {
  red: { bg: "bg-red-50", text: "text-red-600", dot: "from-red-500 to-rose-500", gradient: "from-red-500 to-rose-500", border: "border-red-500" },
  blue: { bg: "bg-blue-50", text: "text-blue-600", dot: "from-blue-500 to-indigo-500", gradient: "from-blue-500 to-indigo-500", border: "border-blue-500" },
  green: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "from-emerald-500 to-teal-500", gradient: "from-emerald-500 to-teal-500", border: "border-emerald-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", dot: "from-purple-500 to-violet-500", gradient: "from-purple-500 to-violet-500", border: "border-purple-500" },
  orange: { bg: "bg-orange-50", text: "text-orange-600", dot: "from-orange-500 to-amber-500", gradient: "from-orange-500 to-amber-500", border: "border-orange-500" },
  pink: { bg: "bg-pink-50", text: "text-pink-600", dot: "from-pink-500 to-rose-500", gradient: "from-pink-500 to-rose-500", border: "border-pink-500" },
  teal: { bg: "bg-teal-50", text: "text-teal-600", dot: "from-teal-500 to-cyan-500", gradient: "from-teal-500 to-cyan-500", border: "border-teal-500" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-600", dot: "from-yellow-500 to-amber-500", gradient: "from-yellow-500 to-amber-500", border: "border-yellow-500" },
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
  const [familyCode, setFamilyCode] = useState("");
  const [appsOpen, setAppsOpen] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("safereads_kid_profile");
    if (data) {
      try { setKidProfile(JSON.parse(data)); } catch { /* ignore */ }
    }
    setFamilyCode(localStorage.getItem("safereads_family_code") || "");
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
    { href: "/read/library", icon: Library, label: "Library", match: (p: string) => p?.startsWith("/read/library") || false },
    { href: "/read/bible", icon: BookOpen, label: "Bible", match: (p: string) => p?.startsWith("/read/bible") || false },
    { href: "/read/home#bookshelf", icon: BookMarked, label: "My Books", match: () => false },
  ];

  const firstName = kidProfile?.name?.split(" ")[0] || "Reader";

  return (
    <>
      {/* ===== Mobile bottom nav (< lg) ===== */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/98 backdrop-blur-lg pb-[env(safe-area-inset-bottom)] lg:hidden">
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

          {/* Other Safe Family apps */}
          <button
            onClick={() => setAppsOpen(true)}
            className="kid-touch flex min-h-[48px] min-w-[48px] flex-col items-center justify-center gap-0.5 rounded-2xl px-3 py-1.5 text-gray-400 transition-all duration-200 hover:text-gray-600 active:scale-95 sm:px-5"
          >
            <LayoutGrid className="h-[22px] w-[22px]" strokeWidth={1.8} />
            <span className="mt-0.5 text-[10px] font-bold">Apps</span>
          </button>

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

      {/* ===== Desktop sidebar (lg+) ===== */}
      <nav className="fixed left-0 top-0 z-50 hidden h-full w-[200px] flex-col border-r border-gray-200/60 bg-white/95 backdrop-blur-lg lg:flex">
        {/* Kid avatar + name */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-5">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${colors.gradient} text-white font-bold text-sm shadow-sm`}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>
          <span className="truncate text-sm font-semibold text-gray-700">
            {firstName}
          </span>
        </div>

        {/* Nav items */}
        <div className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = item.match(pathname || "");
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? `${colors.bg} ${colors.text} border-l-[3px] ${colors.border}`
                    : "border-l-[3px] border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${isActive ? "" : ""}`}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span className={`text-sm ${isActive ? "font-semibold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Bottom actions */}
        <div className="mt-auto border-t border-gray-100 px-3 py-4">
          <button
            onClick={() => setAppsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700"
          >
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span className="text-sm font-medium">Other apps</span>
          </button>
          <button
            onClick={handleSwitchProfile}
            className="flex w-full items-center gap-3 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700"
          >
            <Users className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span className="text-sm font-medium">Switch</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl border-l-[3px] border-transparent px-3 py-2.5 text-gray-500 transition-all duration-200 hover:bg-gray-50 hover:text-gray-700"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.8} />
            <span className="text-sm font-medium">Exit</span>
          </button>
        </div>
      </nav>

      {/* Other Safe Family apps — modal sheet */}
      {appsOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setAppsOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setAppsOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="mb-1 text-center text-lg font-bold text-gray-900">Jump to another app</p>
            <p className="mb-5 text-center text-sm text-gray-500">
              Same family code — no need to type it again.
            </p>
            <SafeFamilySwitcher current="safereads" familyCode={familyCode} />
          </div>
        </div>
      )}
    </>
  );
}
