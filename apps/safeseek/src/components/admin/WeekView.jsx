// This Week: the per-kid record a parent can show someone.
//
// One row per day, the topics assigned and finished with scores, the review
// cards, the tutor messages, the searches, and a subject breakdown over the
// range. "Print this week" turns it into one clean page per kid.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import { Printer, Flame, BookOpen, Layers, MessageSquare, Search, CalendarDays, Users, Plus } from 'lucide-react';
import {
  KidPicker, subjectLabel, formatDayKey, formatDayRange, plural, EmptyState, Card, primaryButton,
} from './shared';
import PrintableRecords from './PrintableRecords';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
];

function statusLabel(t) {
  if (t.status === 'complete') {
    if (t.score != null && t.total) return `Done, ${t.score} of ${t.total}`;
    return 'Done';
  }
  if (t.status === 'started') return 'Started';
  return 'Not started';
}

function statusTone(t) {
  if (t.status === 'complete') return 'bg-green-50 text-green-700';
  if (t.status === 'started') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-500';
}

function Summary({ icon, label, value, sub }) {
  const Icon = icon;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon className="w-3.5 h-3.5" aria-hidden="true" />
        {label}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function DayRow({ day, isToday }) {
  const hasLessons = day.topics.length > 0;
  const hasAnything =
    hasLessons || day.cardsReviewed > 0 || day.tutorMessages > 0 || day.searches > 0 || day.quizzesTaken > 0;

  return (
    <div className={`px-5 py-4 grid grid-cols-1 md:grid-cols-[9rem_1fr_11rem] gap-3 ${hasAnything ? '' : 'bg-gray-50/60'}`}>
      <div>
        <p className={`text-sm font-semibold ${hasAnything ? 'text-gray-900' : 'text-gray-400'}`}>
          {formatDayKey(day.day)}
          {isToday && <span className="ml-1.5 text-[10px] font-semibold text-accent-600 uppercase">Today</span>}
        </p>
      </div>

      <div className="min-w-0">
        {hasLessons ? (
          <ul className="space-y-1.5">
            {day.topics.map((t, i) => (
              <li key={`${t.topic}-${i}`} className="flex items-start gap-2 text-sm">
                <span className={`inline-flex flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusTone(t)}`}>
                  {statusLabel(t)}
                </span>
                <span className="text-gray-800">
                  {t.topic}
                  <span className="text-gray-400"> &middot; {subjectLabel(t.subject)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={`text-sm ${hasAnything ? 'text-gray-500' : 'text-gray-400 italic'}`}>
            {hasAnything ? 'No lessons assigned' : 'Nothing recorded'}
          </p>
        )}
      </div>

      <div className="text-xs text-gray-600 space-y-1 md:text-right">
        {day.cardsReviewed > 0 && (
          <p>
            {plural(day.cardsReviewed, 'review card')}
            <span className="text-gray-400">, {day.cardsCorrect} right</span>
          </p>
        )}
        {day.quizzesTaken > 0 && <p>{plural(day.quizzesTaken, 'quiz', 'quizzes')}</p>}
        {day.tutorMessages > 0 && <p>{plural(day.tutorMessages, 'tutor message')}</p>}
        {day.searches > 0 && <p>{plural(day.searches, 'search', 'searches')}</p>}
      </div>
    </div>
  );
}

export default function WeekView({ kidProfiles, selectedKidId, onSelectKid, onNavigate }) {
  const [days, setDays] = useState(7);
  const [printing, setPrinting] = useState(false);
  const [loadedForPrint, setLoadedForPrint] = useState({});

  const { token } = useAuth();
  const kid = kidProfiles?.find((k) => k._id === selectedKidId) || null;
  const week = useQuery(
    api.progress.getWeek,
    kid ? { kidProfileId: kid._id, days, userToken: token ?? undefined } : 'skip',
  );

  // Rows newest first on screen; the printed page goes oldest first.
  const rows = useMemo(() => (week ? [...week.daily].reverse() : []), [week]);

  const allLoaded = (kidProfiles || []).every((k) => loadedForPrint[k._id]);

  const handleLoaded = useCallback((kidId, ok) => {
    setLoadedForPrint((prev) => (prev[kidId] === ok ? prev : { ...prev, [kidId]: ok }));
  }, []);

  useEffect(() => {
    if (!printing || !allLoaded) return;
    // Let the print pages paint before asking the browser to print.
    const id = window.setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
    return () => window.clearTimeout(id);
  }, [printing, allLoaded]);

  const hasKids = kidProfiles && kidProfiles.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">This week</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            What each kid worked on, day by day. Print it for a portfolio, a co-op, or your own records.
          </p>
        </div>
        {hasKids && (
          <button
            type="button"
            onClick={() => setPrinting(true)}
            disabled={printing}
            className={primaryButton}
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            {printing ? 'Preparing' : days === 7 ? 'Print this week' : `Print these ${days} days`}
          </button>
        )}
      </div>

      {!hasKids ? (
        <EmptyState
          icon={Users}
          title="No kids yet"
          action={
            <button type="button" onClick={() => onNavigate?.('profiles')} className={primaryButton}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create a kid profile
            </button>
          }
        >
          Once you add a kid, their days show up here.
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <KidPicker kidProfiles={kidProfiles} selectedKidId={selectedKidId} onSelect={onSelectKid} />
            <div role="group" aria-label="How many days to show" className="flex items-center bg-gray-100 rounded-lg p-0.5 self-start">
              {RANGES.map((r) => (
                <button
                  key={r.days}
                  type="button"
                  onClick={() => setDays(r.days)}
                  aria-pressed={days === r.days}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    days === r.days ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {!kid ? (
            <p className="text-sm text-gray-500">Pick a kid to see their days.</p>
          ) : week === undefined ? (
            <p className="text-sm text-gray-400">Loading&hellip;</p>
          ) : week === null ? (
            <p className="text-sm text-gray-500">That profile is gone.</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                <CalendarDays className="w-4 h-4 inline-block mr-1 -mt-0.5 text-gray-400" aria-hidden="true" />
                {formatDayRange(week.from, week.to)}
              </p>

              {/* Totals */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Summary
                  icon={BookOpen}
                  label="Lessons finished"
                  value={week.totals.lessonsCompleted}
                  sub={week.totals.lessonsAssigned > 0 ? `of ${plural(week.totals.lessonsAssigned, 'lesson')} assigned` : 'None assigned'}
                />
                <Summary
                  icon={Layers}
                  label="Review cards"
                  value={week.totals.cardsReviewed}
                  sub={week.reviewAccuracy != null ? `${week.reviewAccuracy}% remembered` : 'None reviewed'}
                />
                <Summary icon={MessageSquare} label="Tutor messages" value={week.totals.tutorMessages} />
                <Summary icon={Search} label="Searches" value={week.totals.searches} />
                <Summary
                  icon={Flame}
                  label="Streak"
                  value={plural(week.currentStreak, 'day')}
                  sub={week.longestStreak > 0 ? `Best: ${plural(week.longestStreak, 'day')}` : 'Days in a row'}
                />
              </div>

              {/* Subject breakdown */}
              <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Subjects covered</h3>
                {week.subjects.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No lessons finished in this range.{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate?.('family')}
                      className="text-accent-600 hover:text-accent-700 font-medium underline-offset-2 hover:underline"
                    >
                      Set up subjects under Family.
                    </button>
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {week.subjects.map((s) => (
                      <li key={s.subject} className="text-sm">
                        <span className="font-semibold text-gray-900">{subjectLabel(s.subject)}:</span>{' '}
                        <span className="text-gray-700">{plural(s.lessons, 'lesson')}</span>
                        {s.topics.length > 0 && (
                          <span className="text-gray-500"> &mdash; {s.topics.join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Day rows */}
              <Card className="divide-y divide-gray-50 overflow-hidden">
                {rows.map((day) => (
                  <DayRow key={day.day} day={day} isToday={day.day === week.to} />
                ))}
              </Card>
            </>
          )}
        </>
      )}

      {hasKids && (
        <PrintableRecords
          kidProfiles={kidProfiles}
          days={days}
          onLoaded={handleLoaded}
        />
      )}
    </div>
  );
}
