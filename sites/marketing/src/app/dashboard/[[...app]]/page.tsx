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

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Loader2, LogOut, Copy } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { clearAppSession } from "@/lib/appSession";

type AppId = "safetunes" | "safetube" | "safereads" | "safestudy" | "safespark";

const APPS: { id: AppId; slug: string; name: string; tagline: string; color: string; adminPath: string }[] = [
  { id: "safetunes", slug: "tunes", name: "SafeTunes", tagline: "Music", color: "#7C4DE0", adminPath: "/tunes/admin" },
  { id: "safetube", slug: "tube", name: "SafeTube", tagline: "Video", color: "#F0603A", adminPath: "/tube/admin" },
  { id: "safereads", slug: "reads", name: "SafeReads", tagline: "Books", color: "#3AA06B", adminPath: "/reads/dashboard" },
  { id: "safestudy", slug: "study", name: "SafeStudy", tagline: "Search", color: "#2F6BF0", adminPath: "/study/admin" },
  { id: "safespark", slug: "spark", name: "SafeSpark", tagline: "Build", color: "#F2A413", adminPath: "/spark/parent" },
];

export default function DashboardPage() {
  const params = useParams<{ app?: string[] }>();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.accounts.getCurrentUser, isAuthenticated ? {} : "skip");

  const slug = params?.app?.[0] ?? null;
  const entitled = useMemo(
    () => APPS.filter((a) => (currentUser?.entitledApps ?? []).includes(a.id)),
    [currentUser?.entitledApps]
  );
  const active = slug ? entitled.find((a) => a.slug === slug) ?? null : null;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login?returnTo=/dashboard");
  }, [isLoading, isAuthenticated, router]);

  // Unknown or un-entitled app in the URL → back to the overview.
  useEffect(() => {
    if (slug && currentUser && !active) router.replace("/dashboard");
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
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6 min-w-0">
            <Link href="/dashboard" className="inline-flex items-center gap-2 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5A962] to-[#E88B6A] flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3C7 3 3 7 3 12h18c0-5-4-9-9-9Z" /><path d="M12 12v7a2 2 0 0 0 4 0" /></svg>
              </span>
              <span className="text-lg font-bold text-navy">Safe Family</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-1 text-sm font-semibold">
              <Link href="/dashboard" className={`px-3 py-1.5 rounded-full ${!active ? "bg-cream-dark text-navy" : "text-navy/60 hover:text-navy"}`}>Dashboard</Link>
              <Link href="/account" className="px-3 py-1.5 rounded-full text-navy/60 hover:text-navy">Account</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {familyCode && (
              <button
                onClick={() => navigator.clipboard?.writeText(familyCode)}
                className="hidden md:inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-semibold text-navy/70 hover:text-navy"
                title="Copy family code"
              >
                Family code <span className="font-mono tracking-widest text-navy">{familyCode}</span>
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={async () => { clearAppSession(); await signOut(); router.push("/"); }}
              className="text-sm text-navy/60 hover:text-navy inline-flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        </div>

        {/* App tabs */}
        <div className="flex items-center gap-1 overflow-x-auto -mb-px">
          {entitled.map((a) => {
            const on = active?.slug === a.slug;
            return (
              <Link
                key={a.id}
                href={`/dashboard/${a.slug}`}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap ${on ? "text-navy" : "border-transparent text-navy/60 hover:text-navy"}`}
                style={on ? { borderColor: a.color } : undefined}
              >
                <span className="w-5 h-5 rounded-md" style={{ background: a.color, opacity: on ? 1 : 0.55 }} />
                {a.name}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Content */}
      {active ? (
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
                  <span className="w-12 h-12 rounded-xl shrink-0" style={{ background: a.color }} />
                  <span>
                    <span className="block font-bold text-navy">{a.name}</span>
                    <span className="block text-sm text-navy/60">{a.tagline}</span>
                  </span>
                </Link>
              ))}
              {entitled.length < APPS.length && (
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
