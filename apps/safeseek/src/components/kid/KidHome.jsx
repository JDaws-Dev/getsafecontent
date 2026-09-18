import { useState } from 'react';
import {
  BookOpen, Layers, Flame, GraduationCap, Bookmark, CheckCircle2, ArrowRight, Loader2, Sparkles,
} from 'lucide-react';
import { subjectLabel, parseJsonSafe } from './utils';

/**
 * The kid's home: today's lesson, the review deck, the streak, the tutor and
 * My Stuff. The search box (passed in as children) sits below all of it.
 *
 * `lessons` come from getTodayLessons. A retry after a failed generation makes
 * a second row for the same topic, so rows are collapsed by subject + topic
 * with the most finished one winning.
 */
export default function KidHome({
  profile,
  today,
  lessons,
  lessonsLoading,
  latestSession,
  onOpenLesson,
  onOpenReview,
  onOpenStuff,
  onOpenTutor,
  onPickTopic,
  children,
}) {
  const [topicInput, setTopicInput] = useState('');
  const [picking, setPicking] = useState(false);
  const [pickError, setPickError] = useState('');

  const firstName = profile?.name || 'there';
  const visibleLessons = dedupeLessons(lessons || []);
  const lessonsKnown = Array.isArray(lessons);
  const allDone = visibleLessons.length > 0 && visibleLessons.every((l) => l.status === 'complete');
  const showLessonSkeleton = !lessonsKnown || (lessonsLoading && visibleLessons.length === 0);

  const due = today?.dueCardCount ?? 0;
  const streak = today?.currentStreak ?? 0;
  const resumable = !!(latestSession && !latestSession.stale && latestSession.messages?.length > 0);
  const lastTopic = latestSession?.topic ? String(latestSession.topic).slice(0, 60) : '';

  const handlePick = async (e) => {
    e.preventDefault();
    const topic = topicInput.trim();
    if (!topic || picking || !onPickTopic) return;
    setPicking(true);
    setPickError('');
    try {
      const res = await onPickTopic(topic);
      if (res?.error) setPickError(res.error);
      else setTopicInput('');
    } finally {
      setPicking(false);
    }
  };

  return (
    <div className="animate-fadeIn motion-reduce:animate-none">
      {/* Greeting + streak */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white leading-tight">
            Hi, {firstName}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {todayLine(today)}
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-semibold ${
            streak > 0
              ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
          }`}
          title={today?.longestStreak ? `Best streak: ${today.longestStreak} days` : undefined}
        >
          <Flame className="w-4 h-4" />
          {streak > 0 ? `${streak}-day streak` : 'Start a streak today'}
        </div>
      </div>

      {/* Today's lesson(s) */}
      <section aria-labelledby="todays-lesson" className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-accent-500" />
          <h2 id="todays-lesson" className="font-semibold text-gray-900 dark:text-white text-sm">
            {visibleLessons.length > 1 ? "Today's lessons" : "Today's lesson"}
          </h2>
          {allDone && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-3.5 h-3.5" /> All done
            </span>
          )}
        </div>

        {showLessonSkeleton ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-accent-500 animate-spin motion-reduce:animate-none flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-800 dark:text-gray-200">Getting today's lesson ready</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This can take a few seconds the first time.</p>
            </div>
          </div>
        ) : visibleLessons.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
            <p className="font-medium text-gray-800 dark:text-gray-200">No lesson assigned today.</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Pick something you'd like to learn about and we'll make one for you.
            </p>
            <TopicPicker
              value={topicInput}
              onChange={setTopicInput}
              onSubmit={handlePick}
              busy={picking}
              error={pickError}
            />
          </div>
        ) : (
          <div className="space-y-2">
            {visibleLessons.map((lesson) => (
              <LessonCard key={lesson._id} lesson={lesson} onOpen={() => onOpenLesson(lesson._id)} />
            ))}
            {allDone && onPickTopic && (
              <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-4">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Want one more? Pick a topic.</p>
                <TopicPicker
                  value={topicInput}
                  onChange={setTopicInput}
                  onSubmit={handlePick}
                  busy={picking}
                  error={pickError}
                  compact
                />
              </div>
            )}
          </div>
        )}
      </section>

      {/* Review + Tutor + My Stuff tiles */}
      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        <Tile
          onClick={onOpenReview}
          icon={<Layers className="w-5 h-5" />}
          tone={due > 0 ? 'accent' : 'muted'}
          title="Review"
          body={
            due > 0
              ? `${due} ${due === 1 ? 'card' : 'cards'} ready`
              : today?.cardsReviewed > 0
                ? `Done for today: ${today.cardsCorrect} of ${today.cardsReviewed}`
                : 'Nothing due right now'
          }
          cta={due > 0 ? 'Start' : 'Open'}
        />
        <Tile
          onClick={onOpenTutor}
          icon={<GraduationCap className="w-5 h-5" />}
          tone={resumable ? 'accent' : 'plain'}
          title={resumable ? 'Keep going with the tutor' : 'Ask the tutor'}
          body={
            resumable && lastTopic
              ? `You were working on "${lastTopic}"`
              : resumable
                ? 'Pick up where you left off'
                : lastTopic
                  ? `Last time: "${lastTopic}"`
                  : 'Stuck on homework? Ask away.'
          }
          cta={resumable ? 'Continue' : 'Open'}
        />
        <Tile
          onClick={onOpenStuff}
          icon={<Bookmark className="w-5 h-5" />}
          tone="plain"
          title="My Stuff"
          body="Lessons, quizzes and answers you kept"
          cta="Open"
        />
      </div>

      {/* Search, below the fold */}
      <section aria-labelledby="look-it-up" className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-accent-500" />
          <h2 id="look-it-up" className="font-semibold text-gray-900 dark:text-white text-sm">
            Look something up
          </h2>
        </div>
        {children}
      </section>
    </div>
  );
}

function todayLine(today) {
  if (!today) return "Here's your day.";
  const parts = [];
  if (today.lessonsCompleted > 0) parts.push(`${today.lessonsCompleted} ${today.lessonsCompleted === 1 ? 'lesson' : 'lessons'}`);
  if (today.cardsReviewed > 0) parts.push(`${today.cardsReviewed} ${today.cardsReviewed === 1 ? 'card' : 'cards'}`);
  if (today.quizzesTaken > 0) parts.push(`${today.quizzesTaken} ${today.quizzesTaken === 1 ? 'quiz' : 'quizzes'}`);
  if (parts.length === 0) return "Nothing done yet today. Let's go.";
  return `Today so far: ${parts.join(', ')}.`;
}

function dedupeLessons(rows) {
  const rank = (l) => (l.status === 'complete' ? 3 : l.content ? 2 : 1);
  const byKey = new Map();
  for (const l of rows) {
    const key = `${l.subject}::${(l.topic || '').toLowerCase().trim()}`;
    const prev = byKey.get(key);
    if (!prev || rank(l) > rank(prev) || (rank(l) === rank(prev) && (l._creationTime ?? 0) > (prev._creationTime ?? 0))) {
      byKey.set(key, l);
    }
  }
  return [...byKey.values()];
}

function LessonCard({ lesson, onOpen }) {
  const done = lesson.status === 'complete';
  const started = lesson.status === 'started';
  const ready = !!lesson.content;
  const total = parseJsonSafe(lesson.questions, [])?.length;
  const pill = done
    ? { text: typeof lesson.score === 'number' && total ? `Done · ${lesson.score} of ${total}` : 'Done', tone: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' }
    : !ready
      ? { text: 'Getting ready', tone: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300' }
      : started
        ? { text: 'Started', tone: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' }
        : { text: 'New', tone: 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300' };

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 rounded-2xl p-4 sm:p-5 flex items-center gap-4 transition-colors motion-reduce:transition-none hover:border-accent-300 dark:hover:border-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
        done ? 'border-l-green-500' : 'border-l-accent-500'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400">
            {subjectLabel(lesson.subject)}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${pill.tone}`}>{pill.text}</span>
        </div>
        <p className="font-display text-lg font-semibold text-gray-900 dark:text-white leading-snug break-words">
          {lesson.topic}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {done ? 'Look at it again any time.' : ready ? 'Read it, then answer five questions.' : 'Open it to try again.'}
        </p>
      </div>
      <span className="flex-shrink-0 inline-flex items-center gap-1 text-sm font-medium text-accent-600 dark:text-accent-400">
        {done ? 'Open' : started ? 'Keep going' : 'Start'} <ArrowRight className="w-4 h-4" />
      </span>
    </button>
  );
}

function Tile({ onClick, icon, tone, title, body, cta }) {
  const tones = {
    accent: 'border-accent-200 dark:border-accent-800 bg-accent-50 dark:bg-accent-900/20',
    plain: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
    muted: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
  };
  const iconTones = {
    accent: 'bg-accent-500 text-white',
    plain: 'bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400',
    muted: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 flex flex-col gap-3 transition-colors motion-reduce:transition-none hover:border-accent-300 dark:hover:border-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${tones[tone] || tones.plain}`}
    >
      <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconTones[tone] || iconTones.plain}`}>
        {icon}
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-gray-900 dark:text-white text-sm">{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{body}</span>
      </span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 dark:text-accent-400">
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

function TopicPicker({ value, onChange, onSubmit, busy, error, compact = false }) {
  return (
    <form onSubmit={onSubmit} className={compact ? 'mt-2' : 'mt-3'}>
      <div className="flex gap-2">
        <label htmlFor="pick-topic" className="sr-only">What do you want to learn about?</label>
        <input
          id="pick-topic"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={busy}
          maxLength={120}
          placeholder="Try: the water cycle"
          autoComplete="off"
          className="flex-1 min-w-0 text-[16px] rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:border-accent-400"
        />
        <button
          type="submit"
          disabled={!value.trim() || busy}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors motion-reduce:transition-none disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : null}
          {busy ? 'Making it' : 'Make a lesson'}
        </button>
      </div>
      {error && <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">{error}</p>}
    </form>
  );
}
