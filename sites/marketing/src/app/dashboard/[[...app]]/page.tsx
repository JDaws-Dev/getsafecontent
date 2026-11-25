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
import { Loader2, Copy, Check, Users, ChevronRight } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { FamilyTab } from "@/components/dashboard/FamilyTab";
import { ParentHeader } from "@/components/dashboard/ParentHeader";
import { AppTile } from "@/components/brand/Brand";
import { isRetiredApp } from "@/lib/retiredApps";

type AppId = "safetunes" | "safetube" | "safereads" | "safestudy" | "safespark";

// Every app the dashboard knows. Apps listed in src/lib/retiredApps.ts
// (SafeReads, SafeSpark since 2026-11-25) are dropped below for everyone,
// whatever the family is entitled to: no tab, no card, no link. Their entries
// stay here so taking an app off the retired list brings its tab straight back.
// `short` is the tab label on a phone, so Family + three apps fit at 390px
// without the strip scrolling.
const ALL_APPS: { id: AppId; slug: string; name: string; short: string; tagline: string; color: string; adminPath: string }[] = [
  { id: "safetunes", slug: "tunes", name: "SafeTunes", short: "Tunes", tagline: "Approve music and see requests", color: "#7C4DE0", adminPath: "/tunes/admin" },
  { id: "safetube", slug: "tube", name: "SafeTube", short: "Tube", tagline: "Approve channels and videos", color: "#F0603A", adminPath: "/tube/admin" },
  { id: "safereads", slug: "reads", name: "SafeReads", short: "Reads", tagline: "Books", color: "#3AA06B", adminPath: "/reads/dashboard" },
  { id: "safestudy", slug: "study", name: "SafeStudy", short: "Study", tagline: "Study plan, searches and alerts", color: "#2F6BF0", adminPath: "/study/admin" },
  { id: "safespark", slug: "spark", name: "SafeSpark", short: "Spark", tagline: "Build", color: "#F2A413", adminPath: "/spark/parent" },
];
const APPS = ALL_APPS.filter((a) => !isRetiredApp(a.id));

export default function DashboardPage() {
  const params = useParams<{ app?: string[] }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.accounts.getCurrentUser, isAuthenticated ? {} : "skip");

  const slug = params?.app?.[0] ?? null;
  const showFamily = slug === "family";
  // The apps this family has. Retired apps are never listed, so
  // /dashboard/reads and /dashboard/spark fall back to the overview.
  const entitled = useMemo(() => {
    const has = currentUser?.entitledApps ?? [];
    return APPS.filter((a) => has.includes(a.id));
  }, [currentUser?.entitledApps]);
  const active = slug ? entitled.find((a) => a.slug === slug) ?? null : null;

  // Phone: if the tab strip ever scrolls sideways, bring the selected tab into
  // view. Scroll only the strip, never the page.
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
      <div className="min-h-[100dvh] bg-cream flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-navy/50" />
      </div>
    );
  }

  const familyCode = currentUser.familyCode as string | undefined;
  const tabClass = (on: boolean) =>
    `inline-flex h-11 items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 text-sm font-semibold border-b-2 whitespace-nowrap ${
      on ? "text-navy" : "border-transparent text-navy/60 hover:text-navy"
    }`;
  const copyCode = () => {
    if (!familyCode) return;
    navigator.clipboard?.writeText(familyCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    // 100dvh, not 100vh: on a phone 100vh is taller than the visible screen
    // while the browser's toolbar shows, which pushed the bottom of each app
    // (and its bottom tab bar) under the toolbar.
    <div className="h-[100dvh] bg-cream flex flex-col">
      <ParentHeader current="dashboard" familyCode={familyCode}>
        {/* Family + one tab per app. On a phone the labels are short so all
            four fit across 390px; the strip still scrolls if it must. */}
        <div ref={tabsRef} className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto -mb-px [scrollbar-width:none]">
          <Link
            href="/dashboard/family"
            data-tab="family"
            aria-current={showFamily ? "page" : undefined}
            className={`${tabClass(showFamily)} ${showFamily ? "border-[#E88B6A]" : ""}`}
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
                aria-current={on ? "page" : undefined}
                className={tabClass(on)}
                style={on ? { borderColor: a.color } : undefined}
              >
                <AppTile app={a.id} size="xs" muted={!on} />
                <span className="sm:hidden">{a.short}</span>
                <span className="hidden sm:inline">{a.name}</span>
              </Link>
            );
          })}
        </div>
      </ParentHeader>

      {/* Content */}
      {showFamily ? (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8"><FamilyTab /></main>
      ) : active ? (
        <iframe
          key={active.slug}
          title={`${active.name} parent screens`}
          src={`${active.adminPath}?embed=1`}
          className="flex-1 w-full border-0 bg-cream"
          allow="clipboard-write; autoplay; encrypted-media"
        />
      ) : (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                {currentUser.name ? `Hi, ${String(currentUser.name).split(" ")[0]}` : "Your family"}
              </h1>
              <p className="text-navy/60 mt-1">Set up your kids once in Family. Then approve what they can use in each app.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Link
                href="/dashboard/family"
                className="rounded-2xl bg-white border border-navy/10 p-4 sm:p-5 hover:shadow-md transition flex items-center gap-4"
              >
                <span className="w-12 h-12 rounded-xl shrink-0 bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center" aria-hidden="true">
                  <Users className="w-6 h-6 text-white" strokeWidth={2.25} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-navy">Family</span>
                  <span className="block text-sm text-navy/60">Kids, PINs, hours and daily screen time</span>
                </span>
                <ChevronRight className="w-5 h-5 text-navy/30 shrink-0" />
              </Link>
              {entitled.map((a) => (
                <Link
                  key={a.id}
                  href={`/dashboard/${a.slug}`}
                  className="rounded-2xl bg-white border border-navy/10 p-4 sm:p-5 hover:shadow-md transition flex items-center gap-4"
                >
                  <AppTile app={a.id} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-navy">{a.name}</span>
                    <span className="block text-sm text-navy/60">{a.tagline}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-navy/30 shrink-0" />
                </Link>
              ))}
            </div>
            {entitled.length === 0 && (
              <div className="rounded-2xl border border-dashed border-navy/20 p-5 text-sm text-navy/70">
                Your account doesn&rsquo;t have any apps turned on right now. See{" "}
                <Link href="/account" className="font-semibold text-navy underline underline-offset-2">Account</Link> for your subscription.
              </div>
            )}
            {familyCode && (
              <div className="rounded-2xl bg-white border border-navy/10 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-bold uppercase tracking-wider text-navy/50">Family code</div>
                  <div className="font-mono text-2xl font-bold tracking-widest text-navy">{familyCode}</div>
                  <div className="text-sm text-navy/60">Kids open getsafefamily.com/play and enter this once.</div>
                </div>
                <button
                  onClick={copyCode}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-cream-dark px-4 text-sm font-semibold text-navy"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  );
}
