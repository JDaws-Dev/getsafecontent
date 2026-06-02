'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ArrowUpRight,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  Undo2,
  Eye,
  GraduationCap,
  Globe,
  Search,
  Bookmark,
  Save,
  Lock,
  Shield,
  Palette,
} from 'lucide-react';
import { KidMobileNav, KidHeader } from '@/components/kid/SafeFamilyAppLauncher';
import {
  getAdjacentLessons,
  getLessonBySlug,
  LESSONS,
  TRACK_META,
  type LessonIcon,
  type LessonSection,
  type LessonTrack,
} from '../lessons';

const ICON_MAP: Record<LessonIcon, React.ComponentType<{ className?: string }>> = {
  'message-square': MessageSquare,
  'undo-2': Undo2,
  eye: Eye,
  lightbulb: Lightbulb,
  globe: Globe,
  search: Search,
  bookmark: Bookmark,
  save: Save,
  lock: Lock,
  'alert-triangle': AlertTriangle,
  shield: Shield,
  palette: Palette,
  sparkles: Sparkles,
};

/**
 * Track theme tokens. Full Tailwind classNames so the JIT picks them up
 * statically. Three palettes, all within the VC-polish vocabulary:
 *
 *   talk  → violet (the brand color — "talking to AI well" is core)
 *   think → sky/blue (a cooler, "how it works" register)
 *   smart → amber (judgment / safety / warmth)
 *
 * Each entry covers the surfaces the renderer touches: hero gradient,
 * the big icon chip, the decorative bleed-icon tint, hover accents on
 * the bottom nav cards, the side stripe on headings, list bullets, and
 * the CTA pill inside example cards.
 */
const TRACK_THEMES: Record<
  LessonTrack,
  {
    heroGradient: string;
    heroIconChip: string;
    bleedIcon: string;
    accentText: string;
    accentRing: string;
    accentBorderHover: string;
    accentSideStripe: string;
    listBullet: string;
    ctaBg: string;
    ctaBgHover: string;
    progressBar: string;
  }
> = {
  talk: {
    heroGradient: 'bg-gradient-to-br from-violet-100 via-violet-50 to-white',
    heroIconChip: 'bg-violet-600 text-white ring-4 ring-violet-100',
    bleedIcon: 'text-violet-300',
    accentText: 'text-violet-700',
    accentRing: 'ring-violet-200',
    accentBorderHover: 'hover:border-violet-300',
    accentSideStripe: 'bg-violet-500',
    listBullet: 'bg-violet-500',
    ctaBg: 'bg-violet-600',
    ctaBgHover: 'hover:bg-violet-700',
    progressBar: 'bg-violet-500',
  },
  think: {
    heroGradient: 'bg-gradient-to-br from-sky-100 via-sky-50 to-white',
    heroIconChip: 'bg-sky-600 text-white ring-4 ring-sky-100',
    bleedIcon: 'text-sky-300',
    accentText: 'text-sky-700',
    accentRing: 'ring-sky-200',
    accentBorderHover: 'hover:border-sky-300',
    accentSideStripe: 'bg-sky-500',
    listBullet: 'bg-sky-500',
    ctaBg: 'bg-sky-600',
    ctaBgHover: 'hover:bg-sky-700',
    progressBar: 'bg-sky-500',
  },
  smart: {
    heroGradient: 'bg-gradient-to-br from-amber-100 via-amber-50 to-white',
    heroIconChip: 'bg-amber-600 text-white ring-4 ring-amber-100',
    bleedIcon: 'text-amber-300',
    accentText: 'text-amber-700',
    accentRing: 'ring-amber-200',
    accentBorderHover: 'hover:border-amber-300',
    accentSideStripe: 'bg-amber-500',
    listBullet: 'bg-amber-500',
    ctaBg: 'bg-amber-600',
    ctaBgHover: 'hover:bg-amber-700',
    progressBar: 'bg-amber-500',
  },
};

/**
 * /learn/[slug] viewer. Static lesson content rendered as a stack of
 * typed sections (heading, paragraph, list, example chat, callout).
 * Top header + mobile bottom nav match /learn so the surface feels
 * cohesive. Identity check mirrors LearnLanding — kid session required.
 */
export function LessonView({ slug }: { slug: string }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [kidSessionToken, setKidSessionToken] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setKidSessionToken(localStorage.getItem('lumiKidSession'));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!kidSessionToken) router.replace('/start');
  }, [mounted, kidSessionToken, router]);

  const data = useQuery(
    api.safespark.getKidDashboardData,
    kidSessionToken ? { sessionToken: kidSessionToken } : 'skip',
  );

  const lesson = getLessonBySlug(slug);
  const { previous, next, index } = getAdjacentLessons(slug);

  if (!mounted || !kidSessionToken) {
    return <main className="min-h-screen bg-slate-50" />;
  }

  // Shouldn't happen — page.tsx calls notFound() — but guard anyway.
  if (!lesson) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-center">
        <p className="text-sm text-slate-500">Lesson not found.</p>
        <Link href="/learn" className="mt-4 inline-block text-sm font-semibold text-violet-700">
          ← Back to lessons
        </Link>
      </main>
    );
  }

  const familyCode = data?.familyCode ?? null;
  const Icon = ICON_MAP[lesson.icon];
  const theme = TRACK_THEMES[lesson.track];
  const trackMeta = TRACK_META[lesson.track];

  // 1-based position within the full 15-lesson sequence. Used by the
  // progress strip directly under the page chrome.
  const lessonNumber = index + 1;
  const totalLessons = LESSONS.length;
  const progressPct = (lessonNumber / totalLessons) * 100;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <KidHeader
        familyCode={familyCode}
        rightSlot={
          <Link
            href="/make"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:hidden"
          >
            Skip to building
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* Sequence progress strip — slim, sits right under the global header.
          Track-tinted so the page feels color-coded the moment it loads. */}
      <div
        className="h-1 w-full bg-slate-200"
        role="progressbar"
        aria-valuenow={lessonNumber}
        aria-valuemin={1}
        aria-valuemax={totalLessons}
        aria-label={`Lesson ${lessonNumber} of ${totalLessons}`}
      >
        <div
          className={`h-full ${theme.progressBar} transition-all`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <article className="mx-auto max-w-2xl px-6 py-6 pb-28 lg:pb-12">
        {/* Breadcrumb back to lesson list */}
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All lessons
        </Link>

        {/* Hero — gradient block tinted to the lesson's track, with the
            lesson icon bleeding off the top-right corner at large size.
            This is the "this is a real thing" moment for the kid. */}
        <header
          className={`relative mt-4 overflow-hidden rounded-3xl border border-slate-200 ${theme.heroGradient} px-6 py-8 sm:px-8 sm:py-10`}
        >
          {/* Decorative oversized icon, clipped by the hero. opacity kept
              low so it reads as background texture, not noise. */}
          <Icon
            aria-hidden
            className={`pointer-events-none absolute -right-8 -top-8 h-56 w-56 opacity-20 ${theme.bleedIcon} sm:-right-6 sm:h-64 sm:w-64`}
          />

          <div className="relative">
            <span
              className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${theme.heroIconChip}`}
            >
              <Icon className="h-8 w-8" />
            </span>

            <p
              className={`mt-4 text-[10px] font-bold uppercase tracking-[0.15em] ${theme.accentText}`}
            >
              {trackMeta.ordinal} · Lesson {lessonNumber} of {totalLessons} · {lesson.minutes} min
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {lesson.title}
            </h1>

            <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-700">
              {lesson.description}
            </p>
          </div>
        </header>

        {/* Sections */}
        <div className="mt-8 space-y-6">
          {lesson.sections.map((section, i) => (
            <SectionRenderer key={i} section={section} theme={theme} />
          ))}
        </div>

        {/* Bottom nav: prev / next as visually weighted cards. */}
        <nav className="mt-10 grid grid-cols-1 gap-3 border-t border-slate-200 pt-6 sm:grid-cols-2">
          <PrevNextCard direction="previous" lesson={previous} theme={theme} />
          <NextOrFinishCard next={next} theme={theme} />
        </nav>
      </article>

      <KidMobileNav familyCode={familyCode} />
    </main>
  );
}

function SectionRenderer({
  section,
  theme,
}: {
  section: LessonSection;
  theme: (typeof TRACK_THEMES)[LessonTrack];
}) {
  switch (section.kind) {
    case 'heading':
      // Small track-colored vertical bar on the left replaces the plain
      // h2 — adds visual rhythm without making the page feel decorated.
      return (
        <div className="flex items-center gap-3 pt-2">
          <span className={`h-7 w-1 rounded-full ${theme.accentSideStripe}`} aria-hidden />
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{section.text}</h2>
        </div>
      );
    case 'paragraph':
      return (
        <p className="text-base leading-relaxed text-slate-700">{section.text}</p>
      );
    case 'list':
      return (
        <ul className="ml-1 space-y-2">
          {section.items.map((item, i) => (
            <li key={i} className="flex gap-3 text-base leading-relaxed text-slate-700">
              <span
                className={`mt-[0.55rem] inline-block h-2 w-2 shrink-0 rounded-full ${theme.listBullet}`}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    case 'example':
      // Designed as a fake Spark chat screenshot — kid prompt on the
      // right in a dark bubble, Spark's outcome on the left in a white
      // bubble with a soft violet border. Below: a real CTA button.
      return (
        <div
          className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ${theme.accentRing}`}
        >
          {section.label && (
            <p
              className={`mb-4 text-[10px] font-bold uppercase tracking-[0.15em] ${theme.accentText}`}
            >
              {section.label}
            </p>
          )}

          {/* Kid bubble — right-aligned, slate-900 like a dark iMessage. */}
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-2.5 text-[14px] leading-relaxed text-white shadow-sm">
              <p className="whitespace-pre-wrap">{section.prompt}</p>
            </div>
          </div>

          {/* Spark reply — left-aligned, white with track-colored hairline. */}
          {section.outcome && (
            <div className="mt-3 flex items-start gap-2">
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${theme.ctaBg} text-white shadow-sm`}
                aria-hidden
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <div
                className={`max-w-[88%] rounded-2xl rounded-tl-md border bg-white px-4 py-2.5 text-[14px] leading-relaxed text-slate-700 shadow-sm ring-1 ${theme.accentRing} border-slate-200`}
              >
                <p>{section.outcome}</p>
              </div>
            </div>
          )}

          {/* CTA pre-fills the maker with this lesson's example prompt.
              "Try this in Spark" read as redundant — the kid is already
              in Spark reading a Spark lesson. Renamed to direct action
              language. */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link
              href={`/make?new=true&prompt=${encodeURIComponent(section.prompt)}`}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${theme.ctaBg} ${theme.ctaBgHover}`}
            >
              Send this to the maker
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Opens the maker with this prompt ready to send.
            </p>
          </div>
        </div>
      );
    case 'callout': {
      const isWarning = section.tone === 'warning';
      const IconCmp = isWarning ? AlertTriangle : Lightbulb;

      // Callouts are independent of the track theme — tip is always
      // violet (lightbulb energy), warning is always amber (caution).
      // The left edge gets a thick colored stripe so callouts stand out
      // even when scanning.
      const stripeCls = isWarning ? 'bg-amber-500' : 'bg-violet-500';
      const bgCls = isWarning
        ? 'bg-amber-50 border-amber-200'
        : 'bg-violet-50 border-violet-200';
      const iconChipCls = isWarning
        ? 'bg-amber-500 text-white'
        : 'bg-violet-500 text-white';
      const textCls = isWarning ? 'text-amber-900' : 'text-violet-900';
      const labelCls = isWarning ? 'text-amber-700' : 'text-violet-700';
      const label = isWarning ? 'Heads up' : 'Tip';

      return (
        <div
          className={`relative overflow-hidden rounded-2xl border ${bgCls} pl-5 pr-5 py-4`}
        >
          <span
            className={`absolute left-0 top-0 h-full w-1.5 ${stripeCls}`}
            aria-hidden
          />
          <div className="flex items-start gap-3">
            <span
              className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconChipCls} shadow-sm`}
              aria-hidden
            >
              <IconCmp className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[10px] font-bold uppercase tracking-[0.15em] ${labelCls}`}
              >
                {label}
              </p>
              <p className={`mt-1 text-[15px] leading-relaxed ${textCls}`}>{section.text}</p>
            </div>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

/**
 * Big prev / next nav card. When `lesson` is null, the card renders as
 * a dimmed placeholder so the grid stays balanced on sm+ screens.
 */
function PrevNextCard({
  direction,
  lesson,
  theme,
}: {
  direction: 'previous';
  lesson: ReturnType<typeof getAdjacentLessons>['previous'];
  theme: (typeof TRACK_THEMES)[LessonTrack];
}) {
  if (!lesson) {
    // Empty placeholder — keeps the next card aligned right on sm+.
    return <span className="hidden sm:block" />;
  }

  const Icon = ICON_MAP[lesson.icon];

  return (
    <Link
      href={`/learn/${lesson.slug}`}
      className={`group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md ${theme.accentBorderHover}`}
    >
      <p
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 group-hover:${theme.accentText}`}
      >
        <ArrowLeft className="h-3 w-3" />
        Previous lesson
      </p>
      <div className="mt-2 flex items-start gap-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold tracking-tight text-slate-900 group-hover:text-slate-700">
            {lesson.title}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{lesson.minutes} min read</p>
        </div>
      </div>
    </Link>
  );
}

function NextOrFinishCard({
  next,
  theme,
}: {
  next: ReturnType<typeof getAdjacentLessons>['next'];
  theme: (typeof TRACK_THEMES)[LessonTrack];
}) {
  if (next) {
    const Icon = ICON_MAP[next.icon];
    const nextTheme = TRACK_THEMES[next.track];
    return (
      <Link
        href={`/learn/${next.slug}`}
        className={`group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md ${nextTheme.accentBorderHover} sm:col-start-2`}
      >
        <p
          className={`flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.15em] ${nextTheme.accentText}`}
        >
          Next lesson
          <ArrowRight className="h-3 w-3" />
        </p>
        <div className="mt-2 flex items-start gap-3">
          <div className="min-w-0 flex-1 text-right">
            <p
              className={`text-sm font-bold tracking-tight text-slate-900 group-hover:${nextTheme.accentText}`}
            >
              {next.title}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">{next.minutes} min read</p>
          </div>
          <span
            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${nextTheme.ctaBg}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>
      </Link>
    );
  }

  // No "next" → user just finished the final lesson. Make this card the
  // celebratory beat: back-to-library CTA in the current track's color.
  return (
    <Link
      href="/learn"
      className={`group rounded-2xl border border-slate-200 bg-white p-4 transition hover:shadow-md ${theme.accentBorderHover} sm:col-start-2`}
    >
      <p
        className={`flex items-center justify-end gap-1 text-[10px] font-bold uppercase tracking-[0.15em] ${theme.accentText}`}
      >
        <GraduationCap className="h-3 w-3" />
        You finished the series
      </p>
      <div className="mt-2 flex items-start gap-3">
        <div className="min-w-0 flex-1 text-right">
          <p
            className={`text-sm font-bold tracking-tight text-slate-900 group-hover:${theme.accentText}`}
          >
            Back to all lessons
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">Reread anything you want</p>
        </div>
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${theme.ctaBg}`}
        >
          <GraduationCap className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
