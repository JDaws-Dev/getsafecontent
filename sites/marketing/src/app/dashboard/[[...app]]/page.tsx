"use client";

/**
 * The ONE parent dashboard.
 *
 * Parents used to have five admin pages (one per app) behind one login. This
 * is the single place instead: a shell with the family's apps as tabs, and
 * each app's existing parent screens rendered inside it (same origin, so the
 * shared sign-in just works — no second login, no separate header per app).
 * The apps' own /admin routes redirect here when opened directly.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2, LogOut, Copy, Check, Users } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { clearAppSession } from "@/lib/appSession";
import { FamilyTab } from "@/components/dashboard/FamilyTab";
import { AppTile, UmbrellaMark } from "@/components/brand/Brand";
import { isRetiredApp } from "@/lib/retiredApps";

type AppId = "safetunes" | "safetube" | "safereads" | "safestudy" | "safespark";

// Every app the dashboard knows. Apps listed in src/lib/retiredApps.ts
// (SafeReads, SafeSpark since 2026-11-25) are dropped below for everyone,
// whatever the family is entitled to: no tab, no card, no link. Their entries
// stay here so taking an app off the retired list brings its tab straight back.
const ALL_APPS: { id: AppId; slug: string; name: string; tagline: string; color: string; adminPath: string; comingSoon?: boolean; blurb?: string }[] = [
  { id: "safetunes", slug: "tunes", name: "SafeTunes", tagline: "Music", color: "#7C4DE0", adminPath: "/tunes/admin" },
  { id: "safetube", slug: "tube", name: "SafeTube", tagline: "Video", color: "#F0603A", adminPath: "/tube/admin" },
  { id: "safereads", slug: "reads", name: "SafeReads", tagline: "Books", color: "#3AA06B", adminPath: "/reads/dashboard" },
  { id: "safestudy", slug: "study", name: "SafeStudy", tagline: "Search", color: "#2F6BF0", adminPath: "/study/admin" },
  {
    id: "safespark",
    slug: "spark",
    name: "SafeSpark",
    tagline: "Build",
    color: "#F2A413",
    adminPath: "/spark/parent",
    blurb:
      "A supervised AI lab where kids learn to use AI well, rather than just use it. They practice asking better questions, checking the answers they get, improving the result, and owning the work. Every prompt and every project stays visible to you, with per-kid limits and a parent off-switch. Built for ages 9 to 15.",
  },
];
const APPS = ALL_APPS.filter((a) => !isRetiredApp(a.id));

export default function DashboardPage() {
  const params = useParams<{ app?: string[] }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.accounts.getCurrentUser, isAuthenticated ? {} : "skip");

  const slug = params?.app?.[0] ?? null;
  const showFamily = slug === "family";
  // Apps the family actually has, plus any coming-soon app (shown to everyone so
  // parents know what's on the way). A family that already has a coming-soon
  // app gets the real app, not the teaser. Retired apps are never listed, so
  // /dashboard/reads and /dashboard/spark fall back to the overview.
  const entitled = useMemo(() => {
    const has = currentUser?.entitledApps ?? [];
    return APPS.filter((a) => a.comingSoon || has.includes(a.id)).map((a) =>
      a.comingSoon && has.includes(a.id) ? { ...a, comingSoon: false } : a
    );
  }, [currentUser?.entitledApps]);
  const active = slug ? entitled.find((a) => a.slug === slug) ?? null : null;

  // Phone: the tab bar scrolls sideways, so bring the selected tab into view
  // (the last tabs sit off-screen at 390px). Scroll only the tab strip,
  // never the page.
  const tabsRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const activeKey = showFamily ? "family" : active?.slug ?? "";
  const ready = !!currentUser;
  useEffect(() => {
    const strip = tabsRef.current;
    if (!strip || !activeKey) return;
    const tab = strip.querySelector<HTMLElement>(`[data-tab="${activeKey}"]`);
    if (!tab) return;
    const s = strip.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    const left = strip.scrollLeft + (t.left - s.left) - (s.width - t.width) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [activeKey, ready]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const here = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
      router.replace(`/login?returnTo=${encodeURIComponent(here)}`);
    }
  }, [isLoading, isAuthenticated, router]);

  // Unknown or un-entitled app in the URL → back to the overview.
  useEffect(() => {
    if (slug && slug !== "family" && currentUser && !active) router.replace("/dashboard");
  }, [slug, currentUser, active, router]);

  if (isLoading || !isAuthenticated || !currentUser) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy/50" />
      </div>
    );
  }

  const familyCode = currentUser.familyCode as string | undefined;

  return (
    <div className="h-screen bg-cream flex flex-col">
      {/* Shell header — the only header a parent sees */}
      <header className="bg-white border-b border-navy/10 px-4 sm:px-6">
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="inline-flex items-center gap-2 shrink-0 whitespace-nowrap">
              <UmbrellaMark />
              <span className="text-base sm:text-lg font-bold text-navy">Safe Family</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm font-semibold">
              <Link href="/dashboard" className={`px-3 py-1.5 rounded-full ${!active ? "bg-cream-dark text-navy" : "text-navy/60 hover:text-navy"}`}>Dashboard</Link>
              <Link href="/account" className="px-3 py-1.5 rounded-full text-navy/60 hover:text-navy">Account</Link>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {familyCode && (
              // Always visible: on a phone it is just the code + copy icon, so
              // it fits on one line beside the logo and Sign out at 390px.
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(familyCode);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-navy/10 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-navy/70 hover:text-navy whitespace-nowrap"
                title="Copy family code"
                aria-label={`Family code ${familyCode}. Copy`}
              >
                <span className="hidden md:inline">Family code</span>
                <span className="font-mono tracking-wider sm:tracking-widest text-navy">{familyCode}</span>
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={async () => { clearAppSession(); await signOut(); router.push("/"); }}
              className="text-sm text-navy/60 hover:text-navy inline-flex items-center gap-1 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        {/* App tabs */}
        <div ref={tabsRef} className="flex items-center gap-1 overflow-x-auto -mb-px">
          <Link
            href="/dashboard/family"
            data-tab="family"
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${showFamily ? "text-navy border-[#E88B6A]" : "border-transparent text-navy/60 hover:text-navy"}`}
          >
            <span className="w-5 h-5 rounded-md shrink-0 bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center" aria-hidden="true">
              <Users className="w-3 h-3 text-white" strokeWidth={2.25} />
            </span>
            Family
          </Link>
          {entitled.map((a) => {
            const on = active?.slug === a.slug;
            return (
              <Link
                key={a.id}
                href={`/dashboard/${a.slug}`}
                data-tab={a.slug}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${on ? "text-navy" : "border-transparent text-navy/60 hover:text-navy"}`}
                style={on ? { borderColor: a.color } : undefined}
              >
                <AppTile app={a.id} size="xs" muted={!on} />
                {a.name}
                {a.comingSoon && (
                  <span className="ml-1 rounded-full bg-navy/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy/60">
                    Soon
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Content */}
      {showFamily ? (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8"><FamilyTab /></main>
      ) : active?.comingSoon ? (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-10">
          <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-navy/10 p-8">
            <div className="flex items-center gap-4 mb-4">
              <AppTile app={active.id} size="md" />
              <div>
                <h1 className="text-2xl font-bold text-navy">{active.name}</h1>
                <p className="text-sm font-semibold uppercase tracking-wider text-navy/50">Coming soon</p>
              </div>
            </div>
            <p className="text-navy/70 leading-relaxed">{active.blurb}</p>
            <p className="text-sm text-navy/55 mt-5">
              It isn&rsquo;t open yet. We&rsquo;ll let you know the moment it is.
            </p>
          </div>
        </main>
      ) : active ? (
        <iframe
          key={active.slug}
          title={`${active.name} dashboard`}
          src={`${active.adminPath}?embed=1`}
          className="flex-1 w-full border-0 bg-cream"
          allow="clipboard-write; autoplay; encrypted-media"
        />
      ) : (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy">Your apps</h1>
              <p className="text-navy/60 mt-1">One sign-in, one dashboard. Pick an app to manage it — every app, every kid, right here.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {entitled.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/${a.slug}`}
                  className="rounded-2xl bg-white border border-navy/10 p-5 hover:shadow-md transition flex items-center gap-4"
                >
                  <AppTile app={a.id} size="md" />
                  <span>
                    <span className="block font-bold text-navy">{a.name}</span>
                    <span className="block text-sm text-navy/60">
                      {a.comingSoon ? "Coming soon" : a.tagline}
                    </span>
                  </span>
                </Link>
              ))}
              {APPS.some((a) => !entitled.some((e) => e.id === a.id)) && (
                <Link href="/account" className="rounded-2xl border border-dashed border-navy/20 p-5 flex items-center justify-center text-sm font-semibold text-navy/60 hover:text-navy">
                  Add more apps to your plan
                </Link>
              )}
            </div>
            {familyCode && (
              <div className="rounded-2xl bg-white border border-navy/10 p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-navy/50">Family code</div>
                  <div className="font-mono text-2xl font-bold tracking-widest text-navy">{familyCode}</div>
                  <div className="text-sm text-navy/60">Kids enter this once. It works in every app.</div>
                </div>
                <button onClick={() => navigator.clipboard?.writeText(familyCode)} className="rounded-full bg-cream-dark px-4 py-2 text-sm font-semibold text-navy">Copy</button>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
