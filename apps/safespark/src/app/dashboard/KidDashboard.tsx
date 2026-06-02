'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth as useMarketingAuth } from '@/contexts/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  TrendingUp,
  Hammer,
  GraduationCap,
  UserRound,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { KidMobileNav, KidHeader, OtherAppsStrip } from '@/components/kid/SafeFamilyAppLauncher';

/**
 * Kid-side dashboard. First surface a kid sees after entering their
 * family code + picking a profile. Replaces the old "land straight on
 * the maker" flow which dropped kids into a blank chat box with no
 * sense of what they'd built before or where to begin again.
 *
 * Design notes (the "VC-backed tech company" pass): off-white slate
 * background (slate-50), white cards with subtle borders (border-
 * slate-200/60) and tiny shadows, tight headings (font-bold +
 * tracking-tight, not heavy font-black), restrained palette (violet-
 * 600 primary + slate neutrals + small amber accent for streaks),
 * rounded-2xl cards / rounded-xl buttons (no candy box-shadows). Less
 * "playful elementary school", more "tool you'd see on a Stripe
 * dashboard." Copy stays warm — that's the kid-friendliness — but the
 * chrome is grown-up.
 */

const COLOR_CLASSES: Record<string, string> = {
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  sky: 'bg-sky-500',
  rose: 'bg-rose-500',
};

export function KidDashboard() {
  const router = useRouter();
  const marketing = useMarketingAuth();
  const [mounted, setMounted] = useState(false);
  const [kidSessionToken, setKidSessionToken] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setKidSessionToken(localStorage.getItem('lumiKidSession'));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // No kid session AND no parent session → push to /start to log in.
    if (!kidSessionToken && !marketing.isAuthenticated) {
      router.replace('/start');
    }
  }, [mounted, kidSessionToken, marketing.isAuthenticated, router]);

  const data = useQuery(
    api.safespark.getKidDashboardData,
    kidSessionToken ? { sessionToken: kidSessionToken } : 'skip',
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Up late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Up late';
  }, []);

  // Close account menu on outside click
  useEffect(() => {
    if (!showAccountMenu) return;
    const onClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-account-menu]')) setShowAccountMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('touchstart', onClick);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('touchstart', onClick);
    };
  }, [showAccountMenu]);

  if (!mounted) {
    return <main className="min-h-screen bg-slate-50" />;
  }
  if (!kidSessionToken) {
    return <main className="min-h-screen bg-slate-50" />;
  }
  if (data === undefined) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-slate-200" />
        </div>
      </main>
    );
  }
  if (data === null) {
    // Session expired or kid profile deleted while session still in localStorage.
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-sm space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Looks like you got signed out
          </h1>
          <p className="text-sm text-slate-600">
            Enter your family code again to pick your profile.
          </p>
          <Link
            href="/start"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </main>
    );
  }

  const { profile, stats, mostRecent, recentProjects, familyCode } = data;
  const avatarBg = (profile.avatarColor && COLOR_CLASSES[profile.avatarColor]) || 'bg-violet-500';
  const initial = profile.displayName.charAt(0).toUpperCase();

  const switchProfile = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lumiKidSession');
    }
    router.replace('/start');
  };

  const accountMenuSlot = (
    <div className="relative" data-account-menu>
      <button
        type="button"
        onClick={() => setShowAccountMenu((v) => !v)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={showAccountMenu}
      >
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${avatarBg} text-xs font-bold text-white`}>
          {initial}
        </span>
        <span className="hidden sm:inline">{profile.displayName}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>
      {showAccountMenu && (
        <div className="absolute right-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={switchProfile}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <UserRound className="h-4 w-4 text-slate-400" />
            Switch profile
          </button>
          <button
            type="button"
            onClick={switchProfile}
            className="flex w-full items-center gap-2.5 border-t border-slate-100 px-3.5 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4 text-slate-400" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <KidHeader familyCode={familyCode} rightSlot={accountMenuSlot} />

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10 pb-28 lg:pb-10">
        {/* Hero — greeting + name + quick verb */}
        <section className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-slate-500">{greeting}, {profile.displayName}.</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              What do you want to build today?
            </h1>
          </div>
          <Link
            href="/make?new=true"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Start a new build
          </Link>
        </section>

        {/* Stats strip — three small metrics, tight typography */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat
            label="Total projects"
            value={stats.totalProjects}
            icon={<Hammer className="h-4 w-4" />}
            tone="slate"
          />
          <Stat
            label="Built this week"
            value={stats.buildsThisWeek}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="violet"
          />
          <Stat
            label="Built today"
            value={stats.buildsToday}
            icon={<Clock className="h-4 w-4" />}
            tone={stats.buildsToday > 0 ? 'amber' : 'slate'}
          />
        </section>

        {/* Continue last build (only when there's history) */}
        {mostRecent && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Pick up where you left off
              </h2>
            </div>
            <Link
              href={`/make?project=${mostRecent.id}`}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-violet-300 hover:shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold tracking-tight text-slate-900">
                  {mostRecent.title}
                </p>
                {mostRecent.lastPrompt && (
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                    Last asked: &ldquo;{mostRecent.lastPrompt}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-xs font-medium text-slate-400">
                  {relativeTime(mostRecent.updatedAt)}
                </p>
              </div>
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 group-hover:bg-violet-100">
                <ArrowRight className="h-5 w-5" />
              </span>
            </Link>
          </section>
        )}

        {/* Recent projects grid (skip if there are none) */}
        {recentProjects.length > 0 && (
          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                Your projects
              </h2>
              <Link href="/make" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
                See all in the maker →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {recentProjects.map((p) => (
                <Link
                  key={p.id}
                  href={`/make?project=${p.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 transition hover:border-violet-400 hover:shadow-md"
                  title={p.title}
                >
                  {/*
                    Netflix-card pattern: bigger live thumbnail (40% scale,
                    so game renders at ~625px viewport instead of 320) +
                    title/meta burned into the bottom of the thumbnail
                    with a dark gradient. Removes the dead white footer
                    that made cards feel samey. The whole card hovers
                    with a subtle scale-up so it feels like a tappable
                    tile, not a static thumbnail.
                  */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                    <div
                      className="origin-top-left scale-[0.4] transition duration-300 group-hover:scale-[0.42]"
                      style={{ width: '250%', height: '250%' }}
                    >
                      <iframe
                        srcDoc={p.html}
                        title={p.title}
                        className="pointer-events-none block h-full w-full border-0"
                        sandbox=""
                        loading="lazy"
                      />
                    </div>
                    {/* Bottom gradient + title strip — title burned in
                      Netflix-style so the card has visual punch without
                      a dead white footer underneath. */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-3 pt-8">
                      <div className="flex items-end justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold tracking-tight text-white drop-shadow" title={p.title}>
                            {p.title}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold text-white/70">
                            {relativeTime(p.updatedAt)}
                          </p>
                        </div>
                        {p.isCommunication && (
                          <span className="pointer-events-none inline-flex shrink-0 items-center rounded-full bg-amber-400/95 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950 shadow">
                            chat
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Hover affordance — small play-style arrow, top-right */}
                    <span className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 scale-0 items-center justify-center rounded-full bg-white/95 text-slate-900 shadow-lg transition duration-200 group-hover:scale-100">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state — pretty card with starter prompts */}
        {recentProjects.length === 0 && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
              Your first build is one prompt away
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Tell Spark what you want to make — a game, a quiz, a flashcard set, a poster, a tracker. It builds the whole thing.
            </p>
            <Link
              href="/make?new=true"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Start building
            </Link>
          </section>
        )}

        {/* Training section — linked to /learn (placeholder for now;
            the revamped training plugs in there). Card stays so the
            dashboard surfaces "you can also learn" prominently. */}
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Learn
            </h2>
          </div>
          <Link
            href="/learn"
            className="group block rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-50 to-white p-6 transition hover:border-violet-300 hover:shadow-sm"
          >
            <div className="flex items-start gap-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <h3 className="text-base font-bold tracking-tight text-slate-900">
                  Get better at building with AI
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Short lessons on how to talk to Spark, when to undo, and how to spot when a build is going off-rails. Designed to make every project of yours better.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-violet-700 group-hover:gap-2 transition-all">
                  Start learning <ArrowRight className="h-3.5 w-3.5" />
                </p>
              </div>
            </div>
          </Link>
        </section>

        {/* Cross-app discovery for desktop. Mobile uses the bottom nav's
            Apps button instead — duplicating it in both places would feel
            cramped. */}
        <div className="hidden lg:block">
          <OtherAppsStrip currentApp="safespark" familyCode={familyCode} />
        </div>
      </div>

      {/* Mobile bottom nav — fixed, hidden on lg+. Projects/Make/Learn/Apps. */}
      <KidMobileNav familyCode={familyCode} />
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'slate' | 'violet' | 'amber';
}) {
  const toneClasses = {
    slate: 'text-slate-500 bg-slate-100',
    violet: 'text-violet-700 bg-violet-100',
    amber: 'text-amber-700 bg-amber-100',
  }[tone];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${toneClasses}`}>
          {icon}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.floor(diffMs / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (sec < 60) return 'just now';
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
