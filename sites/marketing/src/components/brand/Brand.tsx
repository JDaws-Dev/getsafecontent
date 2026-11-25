/**
 * Safe Family brand pieces shared by the hub pages (dashboard, play, account,
 * login/signup, marketing header/footer): the peach umbrella mark and each
 * app's accent colour + white line icon. One source so the pages can't drift
 * back to the old purple shield.
 */

import type React from "react";
import { Music, Play, BookOpen, Search, Sparkles, type LucideIcon } from "lucide-react";

type MarkSize = "sm" | "md" | "lg";

const MARK: Record<MarkSize, { box: string; icon: number }> = {
  sm: { box: "w-8 h-8 rounded-lg", icon: 18 },
  md: { box: "w-9 h-9 rounded-xl", icon: 20 },
  lg: { box: "w-12 h-12 rounded-2xl", icon: 26 },
};

/** The peach umbrella mark (same as the /dashboard and /play headers). */
export function UmbrellaMark({ size = "md", className = "" }: { size?: MarkSize; className?: string }) {
  const m = MARK[size];
  return (
    <span className={`${m.box} shrink-0 bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center ${className}`}>
      <svg width={m.icon} height={m.icon} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3C7 3 3 7 3 12h18c0-5-4-9-9-9Z" />
        <path d="M12 12v7a2 2 0 0 0 4 0" />
      </svg>
    </span>
  );
}

/** Umbrella mark + "Safe Family" wordmark. Never wraps. */
export function SafeFamilyLogo({ size = "md", className = "" }: { size?: MarkSize; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap ${className}`}>
      <UmbrellaMark size={size} />
      <span className={`${size === "lg" ? "text-xl" : "text-lg"} font-bold text-navy`}>Safe Family</span>
    </span>
  );
}

export type AppKey = "safetunes" | "safetube" | "safereads" | "safestudy" | "safespark";

export const APP_BRAND: Record<AppKey, { name: string; color: string; Icon: LucideIcon }> = {
  safetunes: { name: "SafeTunes", color: "#7C4DE0", Icon: Music },
  safetube: { name: "SafeTube", color: "#F0603A", Icon: Play },
  safereads: { name: "SafeReads", color: "#3AA06B", Icon: BookOpen },
  safestudy: { name: "SafeStudy", color: "#2F6BF0", Icon: Search },
  safespark: { name: "SafeSpark", color: "#F2A413", Icon: Sparkles },
};

/** A rounded square in the app's accent colour with its white line icon. */
export function AppTile({ app, size = "md", muted = false }: { app: AppKey; size?: "xs" | "sm" | "md" | "lg"; muted?: boolean }) {
  const b = APP_BRAND[app];
  const s = {
    xs: { box: "w-5 h-5 rounded-md", icon: "w-3 h-3" },
    sm: { box: "w-10 h-10 rounded-lg", icon: "w-5 h-5" },
    md: { box: "w-12 h-12 rounded-xl", icon: "w-6 h-6" },
    lg: { box: "w-14 h-14 rounded-2xl", icon: "w-7 h-7" },
  }[size];
  return (
    <span
      className={`${s.box} shrink-0 flex items-center justify-center`}
      style={{ background: b.color, opacity: muted ? 0.55 : 1 }}
      aria-hidden="true"
    >
      <b.Icon className={`${s.icon} text-white`} strokeWidth={2.25} />
    </span>
  );
}

/**
 * The hub's plain top bar (white, thin navy rule, umbrella + wordmark on the
 * left), as on /dashboard. `right` fills the right-hand side.
 */
export function HubHeader({ href = "/", right }: { href?: string; right?: React.ReactNode }) {
  return (
    <header className="bg-white border-b border-navy/10 px-4 sm:px-6">
      <div className="mx-auto h-16 max-w-5xl flex items-center justify-between gap-3">
        <a href={href} className="inline-flex shrink-0" aria-label="Safe Family home">
          <SafeFamilyLogo />
        </a>
        {right ? <div className="flex items-center gap-2 sm:gap-4 text-sm min-w-0">{right}</div> : null}
      </div>
    </header>
  );
}
