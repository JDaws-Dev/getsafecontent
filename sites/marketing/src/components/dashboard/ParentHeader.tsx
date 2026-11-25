"use client";

/**
 * The one header a signed-in parent sees, on /dashboard and /account alike:
 * logo, Dashboard / Account, the family code (from tablet width up — on a
 * phone it lives on the dashboard home and the Family tab instead), Sign out.
 * Everything fits on one line at 390px, and every control is at least 40px
 * tall so it is easy to tap.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Check, Copy, LogOut } from "lucide-react";
import { clearAppSession } from "@/lib/appSession";
import { UmbrellaMark } from "@/components/brand/Brand";

export function ParentHeader({
  current,
  familyCode,
  children,
}: {
  current: "dashboard" | "account";
  familyCode?: string | null;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [copied, setCopied] = useState(false);

  const pill = (on: boolean) =>
    `inline-flex h-10 items-center rounded-full px-3 sm:px-4 text-sm font-semibold whitespace-nowrap ${
      on ? "bg-cream-dark text-navy" : "text-navy/60 hover:text-navy"
    }`;

  return (
    <header className="bg-white border-b border-navy/10 px-4 sm:px-6 shrink-0">
      <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <Link href="/dashboard" className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap" aria-label="Safe Family dashboard">
            <UmbrellaMark />
            <span className="hidden min-[375px]:inline text-base sm:text-lg font-bold text-navy">Safe Family</span>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-1" aria-label="Parent">
            <Link href="/dashboard" className={pill(current === "dashboard")} aria-current={current === "dashboard" ? "page" : undefined}>
              <span className="sm:hidden">Home</span>
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <Link href="/account" className={pill(current === "account")} aria-current={current === "account" ? "page" : undefined}>
              Account
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          {familyCode && (
            <button
              onClick={() => {
                navigator.clipboard?.writeText(familyCode);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
              className="hidden md:inline-flex h-10 items-center gap-2 rounded-full border border-navy/10 bg-white px-3 text-xs font-semibold text-navy/70 hover:text-navy whitespace-nowrap"
              title="Copy family code"
              aria-label={`Family code ${familyCode}. Copy`}
            >
              <span>Family code</span>
              <span className="font-mono tracking-widest text-navy">{familyCode}</span>
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={async () => {
              clearAppSession();
              await signOut();
              router.push("/");
            }}
            className="inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full px-2 sm:px-3 text-sm font-semibold text-navy/60 hover:text-navy whitespace-nowrap"
            aria-label="Sign out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
      {children}
    </header>
  );
}
