"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface AdminNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const navItems = [
  { href: "/admin", label: "Overview", icon: "📊" },
  { href: "/admin/dashboard", label: "Unified Dashboard", icon: "🎯" },
  { href: "/admin/roadmap", label: "Roadmap", icon: "🗺️" },
  { href: "/admin/users", label: "Users", icon: "👥" },
];

const toolItems = [
  { href: "/admin/provision-user", label: "Provision User", icon: "🎁" },
  { href: "/admin/failed-provisions", label: "Failed Provisions", icon: "🔧" },
  { href: "/admin/webhook-logs", label: "Webhook Logs", icon: "🔔" },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: "📋" },
];

export function AdminNav({ user }: AdminNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/admin" className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-500 dark:to-slate-700 rounded-lg flex items-center justify-center">
              <span className="text-xs">🛡️</span>
            </div>
            Admin
          </Link>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 rounded-lg text-sm ${
                  isActive(item.href)
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                {item.icon}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:fixed lg:inset-y-0 lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Logo */}
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-500 dark:to-slate-700 rounded-lg flex items-center justify-center">
                <span className="text-sm">🛡️</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">Safe Family</span>
            </Link>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Admin Dashboard</p>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            <p className="px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Main
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}

            <p className="px-3 pt-4 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Tools
            </p>
            {toolItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* App links */}
          <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              App Dashboards
            </p>
            <div className="space-y-1">
              <a
                href="https://formal-chihuahua-623.convex.site/adminDashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs text-white">
                  🎵
                </span>
                SafeTunes
                <span className="ml-auto text-gray-400">↗</span>
              </a>
              <a
                href="https://rightful-rabbit-333.convex.site/adminDashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xs text-white">
                  📺
                </span>
                SafeTube
                <span className="ml-auto text-gray-400">↗</span>
              </a>
              <a
                href="https://exuberant-puffin-838.convex.site/adminDashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xs text-white">
                  📚
                </span>
                SafeReads
                <span className="ml-auto text-gray-400">↗</span>
              </a>
            </div>
          </div>

          {/* External Links */}
          <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
            <p className="px-3 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              External
            </p>
            <div className="space-y-1">
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">
                  💳
                </span>
                Stripe
                <span className="ml-auto text-gray-400">↗</span>
              </a>
              <a
                href="https://dashboard.convex.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">
                  🔷
                </span>
                Convex
                <span className="ml-auto text-gray-400">↗</span>
              </a>
              <a
                href="https://vercel.com/jeremiahdaws"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span className="w-6 h-6 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs">
                  ▲
                </span>
                Vercel
                <span className="ml-auto text-gray-400">↗</span>
              </a>
            </div>
          </div>

          {/* User profile */}
          <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
            <div className="flex items-center gap-3 px-3">
              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                  {user.name?.[0] || "?"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="mt-3 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />
    </>
  );
}
