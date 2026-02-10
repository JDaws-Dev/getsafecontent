"use client";

import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { BookOpen, LogOut, Settings, User, ChevronDown } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function Navbar() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  return (
    <nav className="border-b border-parchment-200 bg-parchment-50">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-parchment-700" />
          <span className="font-serif text-xl font-bold text-ink-900">
            SafeReads
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-parchment-200" />
          ) : isAuthenticated ? (
            <>
              <div className="hidden items-center gap-4 sm:flex">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
                >
                  Home
                </Link>
                <Link
                  href="/dashboard/search"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
                >
                  Search
                </Link>
                <Link
                  href="/dashboard/kids"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
                >
                  Kids
                </Link>
                <Link
                  href="/dashboard/chat"
                  className="text-sm font-medium text-ink-600 transition-colors hover:text-ink-900"
                >
                  Chat
                </Link>
              </div>
              <UserMenu onSignOut={() => void signOut()} />
            </>
          ) : (
            <button
              onClick={() => void signIn("google")}
              className="rounded-lg bg-parchment-700 px-4 py-2 text-sm font-medium text-parchment-50 transition-colors hover:bg-parchment-800"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const currentUser = useQuery(api.users.currentUser);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="flex items-center gap-1.5 rounded-full border border-parchment-200 bg-white p-1.5 pr-2 text-ink-700 transition-colors hover:bg-parchment-50 focus:outline-none focus:ring-2 focus:ring-parchment-400">
          {currentUser?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUser.image}
              alt=""
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-parchment-200">
              <User className="h-3.5 w-3.5 text-parchment-600" />
            </div>
          )}
          <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-lg border border-parchment-200 bg-white p-1 shadow-lg"
        >
          {currentUser && (
            <div className="border-b border-parchment-100 px-3 py-2">
              <p className="truncate text-sm font-medium text-ink-900">
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
              className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-ink-700 outline-none hover:bg-parchment-50 focus:bg-parchment-50"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1 h-px bg-parchment-100" />

          <DropdownMenu.Item
            onClick={onSignOut}
            className="flex w-full cursor-pointer items-center gap-2 rounded px-3 py-2 text-sm text-ink-700 outline-none hover:bg-parchment-50 focus:bg-parchment-50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
