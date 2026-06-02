'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Hammer, Grid3x3, GraduationCap, X, Music, PlayCircle, BookOpen, Search, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Cross-app kid nav primitives.
 *
 * SafeFamily ships 5 kid-facing apps on separate domains. Every kid
 * surface needs:
 *   - a way to hop to the SAME family's other apps (Music, Video,
 *     Books, Search, Build), with the family code pre-filled via
 *     ?fc=XXXXXX so the kid doesn't re-type it
 *   - a consistent mobile bottom nav so the family-of-apps feels like
 *     one product, not five separate sites
 *
 * This module centralizes the app catalog + exposes a launcher sheet
 * + a mobile bottom nav. Used by /dashboard today; /make also wires
 * the launcher into its account menu.
 */

export type SafeFamilyAppId =
  | 'safetunes'
  | 'safetube'
  | 'safereads'
  | 'safestudy'
  | 'safespark';

export type SafeFamilyApp = {
  id: SafeFamilyAppId;
  /** Product name as it appears in the app's own header. */
  label: string;
  /** One-word what-it-does subtitle. */
  tagline: string;
  url: string;
  host: string;
  /** Lucide icon for the brand mark. */
  Icon: LucideIcon;
  /** Tailwind text color for the product name. */
  accentText: string;
  /** Tailwind background+text combo for the icon chip. */
  accentBg: string;
};

export const SAFE_FAMILY_APPS: SafeFamilyApp[] = [
  {
    id: 'safetunes',
    label: 'SafeTunes',
    tagline: 'Music',
    host: 'https://getsafetunes.com',
    url: '/play',
    Icon: Music,
    accentText: 'text-pink-700',
    accentBg: 'bg-pink-50 text-pink-700',
  },
  {
    id: 'safetube',
    label: 'SafeTube',
    tagline: 'Video',
    host: 'https://getsafetube.com',
    url: '/play',
    Icon: PlayCircle,
    accentText: 'text-red-700',
    accentBg: 'bg-red-50 text-red-700',
  },
  {
    id: 'safereads',
    label: 'SafeReads',
    tagline: 'Books',
    host: 'https://getsafereads.com',
    url: '/read',
    Icon: BookOpen,
    accentText: 'text-orange-700',
    accentBg: 'bg-orange-50 text-orange-700',
  },
  {
    id: 'safestudy',
    label: 'SafeStudy',
    tagline: 'Search',
    host: 'https://getsafestudy.com',
    url: '/play',
    Icon: Search,
    accentText: 'text-sky-700',
    accentBg: 'bg-sky-50 text-sky-700',
  },
  {
    id: 'safespark',
    label: 'SafeSpark',
    tagline: 'Build',
    host: 'https://getsafespark.com',
    url: '/make',
    Icon: Sparkles,
    accentText: 'text-violet-700',
    accentBg: 'bg-violet-50 text-violet-700',
  },
];

export function normalizeFamilyCode(input: string | null | undefined): string {
  return (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export function appHrefWithCode(app: SafeFamilyApp, familyCode: string | null | undefined): string {
  const fc = normalizeFamilyCode(familyCode);
  const suffix = fc.length === 6 ? `?fc=${fc}` : '';
  return `${app.host}${app.url}${suffix}`;
}

/**
 * Modal sheet showing the other apps. Triggered by the "Apps" button
 * in the mobile bottom nav, or by the account menu on /make.
 */
export function AppLauncherSheet({
  open,
  onClose,
  currentApp = 'safespark',
  familyCode,
}: {
  open: boolean;
  onClose: () => void;
  currentApp?: SafeFamilyAppId;
  familyCode?: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const others = SAFE_FAMILY_APPS.filter((a) => a.id !== currentApp);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Switch apps</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              Same family code — picks up where you left off.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {others.map((app) => {
            const Icon = app.Icon;
            return (
              <a
                key={app.id}
                href={appHrefWithCode(app, familyCode)}
                className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-violet-300 hover:shadow-sm"
              >
                <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${app.accentBg}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold tracking-tight ${app.accentText}`}>{app.label}</p>
                  <p className="truncate text-[11px] font-semibold text-slate-500">{app.tagline}</p>
                </div>
              </a>
            );
          })}
        </div>
        <p className="mt-5 text-center text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          One family · Five apps
        </p>
      </div>
    </div>
  );
}

/**
 * Mobile-only bottom nav. Shown on /dashboard. Three tabs: Home,
 * Make, Apps (opens the launcher sheet). On lg+ it's hidden — desktop
 * has plenty of room for header-anchored nav.
 *
 * "Make" is the primary verb-of-the-app (we're SafeSpark — making is
 * the thing). Home routes to /dashboard (overview). Apps opens the
 * cross-app sheet.
 */
export function KidMobileNav({ familyCode }: { familyCode?: string | null }) {
  const pathname = usePathname() ?? '/';
  const [sheetOpen, setSheetOpen] = useState(false);

  const onProjects = pathname.startsWith('/dashboard');
  const onMake = pathname.startsWith('/make');
  const onLearn = pathname.startsWith('/learn');

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-2px_8px_rgba(15,23,42,0.04)] lg:hidden"
        aria-label="App navigation"
      >
        <div className="mx-auto flex max-w-md items-center justify-around gap-1">
          <NavTab href="/dashboard" label="Home" icon={<Home className="h-5 w-5" />} active={onProjects} />
          <NavTab href="/make" label="Make" icon={<Hammer className="h-5 w-5" />} active={onMake} />
          <NavTab href="/learn" label="Learn" icon={<GraduationCap className="h-5 w-5" />} active={onLearn} />
          <NavButton
            label="Apps"
            icon={<Grid3x3 className="h-5 w-5" />}
            onClick={() => setSheetOpen(true)}
          />
        </div>
      </nav>
      <AppLauncherSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        currentApp="safespark"
        familyCode={familyCode}
      />
    </>
  );
}

function NavTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'flex flex-1 flex-col items-center gap-0.5 rounded-xl bg-violet-50 px-3 py-1.5 text-violet-700'
          : 'flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-slate-500 hover:bg-slate-50'
      }
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </Link>
  );
}

function NavButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-slate-500 hover:bg-slate-50"
    >
      {icon}
      <span className="text-[11px] font-semibold">{label}</span>
    </button>
  );
}

/**
 * One-size-fits-all kid-page header. Replaces the bespoke headers
 * that each page (dashboard / make / learn / lesson view) had — they
 * had drifted into 3 different brand treatments, different button
 * positions, different alignment. This consolidates so every kid page
 * looks like it belongs to the same product.
 *
 * Slots:
 *  - left: SafeSpark brand mark (always present)
 *  - middle: KidDesktopNav (Home / Make / Learn / Apps)
 *  - right: account menu OR a `rightSlot` override (e.g. /make's
 *    project title + action cluster). Defaults to a slim "Sign in /
 *    Switch profile" affordance based on the kidSessionToken in
 *    localStorage.
 *
 * Pages that need extra in-header context (like /make's project title
 * or /learn/[slug]'s "Skip to building") pass it as `rightSlot`.
 */
export function KidHeader({
  familyCode,
  rightSlot,
}: {
  familyCode?: string | null;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="flex-none border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-slate-900"
            aria-label="SafeSpark home"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            SafeSpark
          </Link>
          <KidDesktopNav familyCode={familyCode} />
        </div>
        <div className="flex items-center gap-2">
          {rightSlot}
        </div>
      </div>
    </header>
  );
}

/**
 * Desktop-only cross-page nav strip. Mirrors KidMobileNav (Home / Make
 * / Learn / Apps) but renders inline in each page header on lg+.
 * Without this, desktop has ZERO way to navigate between /dashboard,
 * /make, and /learn — kids would have to know the URLs. Drop into any
 * page's top header just left of the account menu.
 */
export function KidDesktopNav(_props: { familyCode?: string | null }) {
  // _familyCode kept in signature for API stability — the Apps cross-
  // app launcher used to live here too but Jeremiah pulled it out
  // (dashboard's OtherAppsStrip + mobile nav's Apps sheet are enough).
  const pathname = usePathname() ?? '/';
  const onHome = pathname.startsWith('/dashboard');
  const onMake = pathname.startsWith('/make');
  const onLearn = pathname.startsWith('/learn');
  return (
    <nav className="hidden items-center gap-1 lg:flex" aria-label="App navigation">
      <DesktopNavTab href="/dashboard" label="Home" icon={<Home className="h-4 w-4" />} active={onHome} />
      <DesktopNavTab href="/make" label="Make" icon={<Hammer className="h-4 w-4" />} active={onMake} />
      <DesktopNavTab href="/learn" label="Learn" icon={<GraduationCap className="h-4 w-4" />} active={onLearn} />
    </nav>
  );
}

function DesktopNavTab({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-2.5 py-1.5 text-sm font-semibold text-violet-700'
          : 'inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }
    >
      {icon}
      {label}
    </Link>
  );
}

/**
 * Desktop-side "other apps" strip — small chips at the bottom of the
 * dashboard so kids on desktop have the same cross-app discovery
 * without needing the mobile sheet.
 */
export function OtherAppsStrip({
  currentApp = 'safespark',
  familyCode,
}: {
  currentApp?: SafeFamilyAppId;
  familyCode?: string | null;
}) {
  const others = SAFE_FAMILY_APPS.filter((a) => a.id !== currentApp);
  return (
    <section>
      <p className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
        Other Safe Family apps
      </p>
      <div className="grid grid-cols-4 gap-3">
        {others.map((app) => {
          const Icon = app.Icon;
          return (
            <a
              key={app.id}
              href={appHrefWithCode(app, familyCode)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-violet-300 hover:shadow-sm"
            >
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${app.accentBg}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-bold tracking-tight ${app.accentText}`}>{app.label}</p>
                <p className="truncate text-[11px] font-semibold text-slate-500">{app.tagline}</p>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
