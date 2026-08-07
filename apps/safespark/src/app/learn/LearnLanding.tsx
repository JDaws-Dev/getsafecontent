'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  Sparkles,
  ArrowRight,
  GraduationCap,
  MessageSquare,
  Undo2,
  Eye,
  Lightbulb,
  Globe,
  Search,
  Bookmark,
  Save,
  Lock,
  AlertTriangle,
  Shield,
  Palette,
} from 'lucide-react';
import { KidMobileNav, KidHeader } from '@/components/kid/SafeFamilyAppLauncher';
import {
  LESSONS,
  TRACK_META,
  type Lesson,
  type LessonIcon,
  type LessonTrack,
} from './lessons';

/**
 * Per-track surface tokens for the lesson library. Mirrors the palette
 * the viewer uses, kept lighter here since cards are quieter than the
 * hero block on /learn/[slug].
 */
const TRACK_THEMES: Record<
  LessonTrack,
  {
    cardTint: string;
    cardBorderHover: string;
    iconChip: string;
    accentText: string;
    sectionStripe: string;
    sectionGradient: string;
    sectionIconChip: string;
  }
> = {
  talk: {
    cardTint: 'bg-accent-50/40',
    cardBorderHover: 'hover:border-accent-300',
    iconChip: 'bg-accent-100 text-accent-700',
    accentText: 'text-accent-700',
    sectionStripe: 'bg-accent-500',
    sectionGradient: 'bg-gradient-to-r from-accent-100 via-accent-50 to-transparent',
    sectionIconChip: 'bg-accent-600 text-brand-navy',
  },
  think: {
    cardTint: 'bg-sky-50/40',
    cardBorderHover: 'hover:border-sky-300',
    iconChip: 'bg-sky-100 text-sky-700',
    accentText: 'text-sky-700',
    sectionStripe: 'bg-sky-500',
    sectionGradient: 'bg-gradient-to-r from-sky-100 via-sky-50 to-transparent',
    sectionIconChip: 'bg-sky-600 text-white',
  },
  smart: {
    cardTint: 'bg-amber-50/40',
    cardBorderHover: 'hover:border-amber-300',
    iconChip: 'bg-amber-100 text-amber-700',
    accentText: 'text-amber-700',
    sectionStripe: 'bg-amber-500',
    sectionGradient: 'bg-gradient-to-r from-amber-100 via-amber-50 to-transparent',
    sectionIconChip: 'bg-amber-600 text-white',
  },
};

const TRACK_ORDER: LessonTrack[] = ['talk', 'think', 'smart'];

/**
 * /learn — lesson library landing. Driven entirely by the LESSONS
 * array in ./lessons.ts. Cards grouped by track with a colored section
 * header for each — gives the page a textbook-of-contents feel instead
 * of a flat 15-card grid.
 */
export function LearnLanding() {
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

  // Use the dashboard query just to pull familyCode for the mobile nav's
  // cross-app links. Lightweight; the page renders fine without it.
  const data = useQuery(
    api.safespark.getKidDashboardData,
    kidSessionToken ? { sessionToken: kidSessionToken } : 'skip',
  );

  if (!mounted || !kidSessionToken) {
    return <main className="min-h-screen bg-brand-cream" />;
  }

  const familyCode = data?.familyCode ?? null;

  // Group lessons by track, preserving their original order so position
  // numbers (1-15) line up with the array index. We keep a running
  // counter so each card knows its 1-of-15 spot, not its 1-of-5 spot.
  const lessonsByTrack: Record<LessonTrack, { lesson: Lesson; position: number }[]> = {
    talk: [],
    think: [],
    smart: [],
  };
  LESSONS.forEach((lesson, idx) => {
    lessonsByTrack[lesson.track].push({ lesson, position: idx + 1 });
  });

  return (
    <main className="min-h-screen bg-brand-cream text-slate-900">
      <KidHeader
        familyCode={familyCode}
        rightSlot={
          <Link
            href="/make"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-brand-cream lg:hidden"
          >
            Skip to building
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="mx-auto max-w-3xl space-y-10 px-6 py-10 pb-28 lg:pb-10">
        {/* Hero */}
        <section className="text-center">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-600 text-brand-navy shadow-sm ring-4 ring-accent-100">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Get really good at building with AI.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-600">
            Short lessons — about a minute each — that teach you how to talk to Spark, when to undo, and how to spot when a build is going off-rails. The kids who go through this ship games people actually want to play.
          </p>
          <p className="mx-auto mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
            {LESSONS.length} lessons · 3 tracks · ~15 minutes total
          </p>
        </section>

        {/* Tracks */}
        {TRACK_ORDER.map((track) => {
          const meta = TRACK_META[track];
          const theme = TRACK_THEMES[track];
          const entries = lessonsByTrack[track];
          return (
            <section key={track}>
              {/* Track header — a soft gradient bar with the track ordinal,
                  title, and tagline. Anchors the cards beneath it visually
                  and explains what unit the kid is about to start. */}
              <div
                className={`mb-4 flex items-start gap-3 overflow-hidden rounded-2xl border border-slate-200 px-4 py-3.5 ${theme.sectionGradient}`}
              >
                <span
                  className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ${theme.sectionIconChip}`}
                  aria-hidden
                >
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-[0.15em] ${theme.accentText}`}
                  >
                    {meta.ordinal} · {entries.length} lessons
                  </p>
                  <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                    {meta.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-600">{meta.tagline}</p>
                </div>
              </div>

              {/* Single-column stack within each track so the reading
                  order is unambiguously top-to-bottom. The previous
                  2-column grid made it unclear whether lesson 2 was
                  next-to or next-down from lesson 1 (the "side stack
                  on desktop is hard to decipher" complaint). */}
              <div className="space-y-2">
                {entries.map(({ lesson, position }) => (
                  <LessonCard
                    key={lesson.slug}
                    lesson={lesson}
                    position={position}
                    total={LESSONS.length}
                    theme={theme}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {/* Start building */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h3 className="text-base font-bold tracking-tight text-slate-900">
            Best way to learn is to ship something.
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Read a lesson, then open the maker and try what you just learned on a real project.
          </p>
          <Link
            href="/make"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent-600 px-5 py-2.5 text-sm font-semibold text-brand-navy shadow-sm hover:bg-accent-700"
          >
            Open the maker
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>

      <KidMobileNav familyCode={familyCode} />
    </main>
  );
}

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

function LessonCard({
  lesson,
  position,
  total: _total,
  theme,
}: {
  lesson: Lesson;
  position: number;
  total: number;
  theme: (typeof TRACK_THEMES)[LessonTrack];
}) {
  const Icon = ICON_MAP[lesson.icon];
  // Two-digit position chip on the far left makes ordering obvious at
  // a glance (1 → 2 → 3, top to bottom). The chip uses the track's
  // accent color so the kid sees lesson numbers AND track at the same
  // moment.
  const positionLabel = position.toString().padStart(2, '0');
  return (
    <Link
      href={`/learn/${lesson.slug}`}
      className={`group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md ${theme.cardBorderHover}`}
    >
      {/* Position number — the "you are here in sequence" anchor */}
      <span
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${theme.iconChip} text-base font-black tabular-nums tracking-tight transition group-hover:scale-105`}
        aria-hidden
      >
        {positionLabel}
      </span>
      {/* Title + description */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-bold tracking-tight text-slate-900 transition group-hover:${theme.accentText}`}
        >
          {lesson.title}
        </p>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-slate-600">{lesson.description}</p>
      </div>
      {/* Topic icon (subtle, visual texture only — secondary to the number) */}
      <span
        className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 sm:inline-flex"
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-400">
        {lesson.minutes} min
        <ArrowRight
          className={`h-3.5 w-3.5 transition group-hover:translate-x-0.5 ${theme.accentText.replace('text-', 'group-hover:text-')}`}
        />
      </span>
    </Link>
  );
}
