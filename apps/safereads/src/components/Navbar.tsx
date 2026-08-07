"use client";

import Link from "next/link";
import { BookOpen, LogOut, Settings, User, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/contexts/AuthContext";
import { SafeFamilyParentSwitcher } from "@/components/SafeFamilySwitcher";

export function Navbar() {
  const { user: authUser, isAuthenticated, isLoading, logout } = useAuth();

  // Family code for the cross-app switcher — authoritative value lives on the
  // local users row (users.familyCode), synced from the verified login token.
  const currentUser = useQuery(
    api.users.currentUser,
    authUser?.email ? { email: authUser.email } : "skip"
  );
  const familyCode =
    currentUser?.familyCode ||
    (typeof window !== "undefined" ? localStorage.getItem("safereads_family_code") || "" : "");

  return (
    <nav className="border-b border-brand-cream-2 bg-brand-cream/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold text-brand-navy">
            SafeReads
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-brand-cream-2" />
          ) : !isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-4">
              <a
                href="https://getsafefamily.com"
                className="hidden sm:block text-sm font-medium text-ink-600 hover:text-accent-700 transition-colors"
              >
                Safe Family
              </a>
              <span className="hidden sm:block text-ink-200">|</span>
              <Link
                href="/login"
                className="text-sm font-medium text-ink-600 hover:text-brand-navy transition-colors"
              >
                Parent Login
              </Link>
              <Link
                href="/signup"
                className="btn-brand rounded-lg text-sm"
              >
                Start Free Trial
              </Link>
            </div>
          ) : (
            <>
              <div className="hidden items-center gap-4 sm:flex">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-navy"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard/search"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-navy"
                >
                  Search
                </Link>
                <Link
                  href="/dashboard/kids"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-navy"
                >
                  Kids
                </Link>
                <Link
                  href="/dashboard/chat"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-brand-navy"
                >
                  Chat
                </Link>
              </div>
              {/* Cross-app Safe Family switcher — desktop (always visible lg+) */}
              <div className="hidden lg:flex">
                <SafeFamilyParentSwitcher current="safereads" familyCode={familyCode} showLabel={false} />
              </div>
              <UserMenu onSignOut={logout} />
            </>
          )}
        </div>
      </div>

      {/* Cross-app Safe Family switcher — mobile row (always visible < lg) */}
      {isAuthenticated && !isLoading && (
        <div className="lg:hidden flex justify-center border-t border-brand-cream-2 py-2">
          <SafeFamilyParentSwitcher current="safereads" familyCode={familyCode} tile={40} />
        </div>
      )}
    </nav>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { user: authUser } = useAuth();
  const currentUser = useQuery(api.users.currentUser, authUser?.email ? { email: authUser.email } : "skip");

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-brand-cream-2 bg-white p-1.5 pr-2 text-ink-700 transition-colors hover:bg-brand-cream-2 focus:outline-none focus:ring-2 focus:ring-accent-400">
          {currentUser?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.image}
              alt=""
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-100">
              <User className="h-3.5 w-3.5 text-accent-600" />
            </div>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-2xl border border-brand-cream-2 bg-white p-1 shadow-lg"
        >
          {currentUser && (
            <div className="border-b border-brand-cream-2 px-3 py-2">
              <p className="truncate text-sm font-medium text-brand-navy">
                {currentUser.name ?? "User"}
              </p>
              <p className="truncate text-xs text-ink-400">
                {currentUser.email}
              </p>
            </div>
          )}

          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/settings"
              className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-ink-700 outline-none hover:bg-brand-cream-2 focus:bg-brand-cream-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-brand-cream-2" />

          <DropdownMenu.Item
            onClick={onSignOut}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-ink-700 outline-none hover:bg-brand-cream-2 focus:bg-brand-cream-2"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
