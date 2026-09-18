// Family tab: the parent sets up each kid's daily program.
//
// A "track" is one subject for one kid: a list of topics in order, one lesson
// each. Every school day SafeStudy takes the next topic in each active track
// and turns it into a lesson. The parent's job here is to type the topics and
// keep the pointer honest; the app does the rest.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';
import ConfirmModal from '../common/ConfirmModal';
import {
  BookOpen, Plus, Pencil, Trash2, X, Save, Check, ChevronDown, ChevronUp, Users, RotateCcw,
} from 'lucide-react';
import {
  KidPicker, SUBJECTS, WEEKDAYS, subjectLabel, plural, EmptyState, Card,
  primaryButton, secondaryButton, inputClass,
} from './shared';

const SUBJECT_TONES = {
  math: 'bg-accent-50 text-accent-700',
  science: 'bg-teal-50 text-teal-700',
  history: 'bg-orange-50 text-orange-700',
  reading: 'bg-purple-50 text-purple-700',
  writing: 'bg-pink-50 text-pink-700',
  bible: 'bg-amber-50 text-amber-700',
  custom: 'bg-gray-100 text-gray-700',
};

function SubjectBadge({ subject }) {
  const tone = SUBJECT_TONES[subject] || SUBJECT_TONES.custom;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${tone}`}>
      {subjectLabel(subject)}
    </span>
  );
}

function describeDays(days) {
  if (!days || days.length === 0) return 'Every day';
  const sorted = [...days].sort((a, b) => a - b);
  const weekdays = [1, 2, 3, 4, 5];
  if (sorted.length === 5 && weekdays.every((d) => sorted.includes(d))) return 'Weekdays';
  return sorted.map((d) => WEEKDAYS[d]?.short ?? d).join(', ');
}

function parseTopics(text) {
  return text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// Track form (create + edit)
// ---------------------------------------------------------------------------

function TrackForm({ kidProfileId, track, onDone, onCancel, showToast }) {
  const { token } = useAuth();
  const createTrack = useMutation(api.lessonQueries.createTrack);
  const updateTrack = useMutation(api.lessonQueries.updateTrack);

  const editing = !!track;
  const [subject, setSubject] = useState(track?.subject ?? '');
  const [title, setTitle] = useState(track?.title ?? '');
  const [topicsText, setTopicsText] = useState(track ? track.topics.join('\n') : '');
  const [days, setDays] = useState(track?.days ?? []);
  const [showMore, setShowMore] = useState(editing && ((track?.days?.length ?? 0) > 0 || track?.title !== subjectLabel(track?.subject)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const subjectRef = useRef(null);

  useEffect(() => {
    subjectRef.current?.focus();
  }, []);

  const topics = useMemo(() => parseTopics(topicsText), [topicsText]);

  const toggleDay = (value) => {
    setDays((prev) => (prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value].sort((a, b) => a - b)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!subject) {
      setError('Pick a subject first.');
      subjectRef.current?.focus();
      return;
    }
    if (topics.length === 0) {
      setError('Add at least one topic. Each line becomes one lesson.');
      return;
    }
    setSaving(true);
    try {
      const finalTitle = title.trim() || subjectLabel(subject);
      if (editing) {
        const patch = {
          trackId: track._id,
          title: finalTitle,
          topics,
          days,
          userToken: token ?? undefined,
        };
        // If the list got shorter than where the kid was, park the pointer at
        // the end rather than pointing past it.
        if (track.currentIndex > topics.length) patch.currentIndex = topics.length;
        await updateTrack(patch);
        showToast?.('Subject updated.');
      } else {
        await createTrack({
          kidProfileId,
          subject,
          title: finalTitle,
          topics,
          days: days.length > 0 ? days : undefined,
          userToken: token ?? undefined,
        });
        showToast?.(`${finalTitle} added. The first lesson is "${topics[0]}".`);
      }
      onDone?.();
    } catch (err) {
      setError(err?.message || 'Could not save this subject. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const titlePlaceholder = subject ? subjectLabel(subject) : 'For example: Fractions unit';

  return (
    <form onSubmit={handleSubmit} className="bg-accent-50/60 border border-accent-100 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-semibold text-gray-900">{editing ? `Edit ${track.title}` : 'Add a subject'}</h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={`track-subject-${track?._id ?? 'new'}`} className="block text-xs font-semibold text-gray-600 mb-1">
            Subject
          </label>
          <select
            id={`track-subject-${track?._id ?? 'new'}`}
            ref={subjectRef}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={editing}
            required
            className={`${inputClass} disabled:bg-gray-50 disabled:text-gray-500`}
          >
            <option value="" disabled>
              Choose a subject
            </option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`track-title-${track?._id ?? 'new'}`} className="block text-xs font-semibold text-gray-600 mb-1">
            Name it (optional)
          </label>
          <input
            id={`track-title-${track?._id ?? 'new'}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={titlePlaceholder}
            maxLength={80}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <label htmlFor={`track-topics-${track?._id ?? 'new'}`} className="block text-xs font-semibold text-gray-600">
            Topics, one per line
          </label>
          <span className="text-xs text-gray-500">
            {topics.length === 0 ? 'Each line becomes one lesson' : plural(topics.length, 'lesson')}
          </span>
        </div>
        <textarea
          id={`track-topics-${track?._id ?? 'new'}`}
          value={topicsText}
          onChange={(e) => setTopicsText(e.target.value)}
          rows={6}
          placeholder={'Long division\nRemainders\nDividing by two-digit numbers\nChecking your answer\nWord problems'}
          className={`${inputClass} font-mono text-[13px] leading-6`}
        />
        <p className="text-xs text-gray-500 mt-1">
          The kid works through these in order. You can add more any time, and you can move where they are below.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
        >
          {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Which days it runs
        </button>
        {showMore && (
          <div className="mt-2">
            <div role="group" aria-label="Days this subject runs" className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((d) => {
                const on = days.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    aria-pressed={on}
                    aria-label={d.long}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      on
                        ? 'bg-accent-500 border-accent-500 text-white'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-accent-300'
                    }`}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">
              {days.length === 0 ? 'No days picked, so it runs every day.' : `Runs on ${describeDays(days)}.`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button type="submit" disabled={saving} className={primaryButton}>
          <Save className="w-4 h-4" />
          {saving ? 'Saving' : editing ? 'Save changes' : 'Add subject'}
        </button>
        <button type="button" onClick={onCancel} className={secondaryButton}>
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// One track
// ---------------------------------------------------------------------------

function TrackCard({ track, onEdit, onDelete, showToast }) {
  const { token } = useAuth();
  const updateTrack = useMutation(api.lessonQueries.updateTrack);
  const [busy, setBusy] = useState(false);

  const total = track.topics.length;
  const index = Math.min(track.currentIndex, total);
  const finished = index >= total;
  const nextTopic = finished ? null : track.topics[index];
  const done = index;

  const patch = async (changes, message) => {
    setBusy(true);
    try {
      await updateTrack({ trackId: track._id, ...changes, userToken: token ?? undefined });
      if (message) showToast?.(message);
    } catch (err) {
      showToast?.(err?.message || 'Could not update this subject.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const pointerId = `track-pointer-${track._id}`;

  return (
    <Card className={`p-5 ${track.active ? '' : 'opacity-75'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-gray-900 truncate">{track.title}</h4>
            <SubjectBadge subject={track.subject} />
            {!track.active && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Paused</span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {plural(total, 'lesson')} &middot; {describeDays(track.days)}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onEdit}
            className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition"
            aria-label={`Edit ${track.title}`}
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            aria-label={`Remove ${track.title}`}
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
          <span>{finished ? `All ${total} done` : `${done} of ${total} done`}</span>
          <span>{finished ? '' : `Next up: ${nextTopic}`}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="h-full bg-accent-500 rounded-full transition-all"
            style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* Where they are */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <label htmlFor={pointerId} className="block text-xs font-semibold text-gray-600 mb-1">
            Next lesson
          </label>
          <select
            id={pointerId}
            value={index}
            disabled={busy}
            onChange={(e) => {
              const next = Number(e.target.value);
              patch({ currentIndex: next }, next >= total ? 'Marked as finished.' : `Next lesson is "${track.topics[next]}".`);
            }}
            className={inputClass}
          >
            {track.topics.map((topic, i) => (
              <option key={`${i}-${topic}`} value={i}>
                {i + 1}. {topic}
              </option>
            ))}
            <option value={total}>Finished all of these</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          {finished && (
            <button
              type="button"
              disabled={busy}
              onClick={() => patch({ currentIndex: 0 }, 'Starting this subject over from the top.')}
              className={secondaryButton}
            >
              <RotateCcw className="w-4 h-4" />
              Start over
            </button>
          )}
          <button
            type="button"
            role="switch"
            aria-checked={track.active}
            disabled={busy}
            onClick={() => patch({ active: !track.active }, track.active ? 'Paused. No new lessons until you turn it back on.' : 'Back on.')}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition ${
              track.active
                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span
              className={`relative inline-block w-8 rounded-full transition ${track.active ? 'bg-green-500' : 'bg-gray-300'}`}
              style={{ height: 18 }}
              aria-hidden="true"
            >
              <span
                className="absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full shadow transition-all"
                style={{ left: track.active ? 16 : 2 }}
              />
            </span>
            {track.active ? 'On' : 'Paused'}
          </button>
        </div>
      </div>

      {finished && (
        <p className="text-xs text-gray-500 mt-3">
          They have finished every topic here. Add more topics with Edit, or start over.
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------

export default function FamilyTab({ kidProfiles, selectedKidId, onSelectKid, onNavigate, showToast }) {
  const { token } = useAuth();
  const deleteTrack = useMutation(api.lessonQueries.deleteTrack);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const kid = kidProfiles?.find((k) => k._id === selectedKidId) || null;

  const tracks = useQuery(
    api.lessonQueries.getTracks,
    kid ? { kidProfileId: kid._id, userToken: token ?? undefined } : 'skip',
  );

  // Close any open form when the parent switches kids.
  useEffect(() => {
    setAdding(false);
    setEditingId(null);
  }, [selectedKidId]);

  const sortedTracks = useMemo(() => {
    if (!tracks) return [];
    return [...tracks].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return a.createdAt - b.createdAt;
    });
  }, [tracks]);

  const hasKids = kidProfiles && kidProfiles.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Daily lessons</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Set up what each kid studies. Each school day SafeStudy turns the next topic in every subject
          into a short lesson with a few questions to check. The tutor knows what they are working on, and
          their week shows up under This Week.
        </p>
      </div>

      {!hasKids ? (
        <EmptyState
          icon={Users}
          title="Add a kid first"
          action={
            <button type="button" onClick={() => onNavigate?.('profiles')} className={primaryButton}>
              <Plus className="w-4 h-4" />
              Create a kid profile
            </button>
          }
        >
          Lessons belong to a kid. Once you have a profile you can give them subjects here.
        </EmptyState>
      ) : (
        <>
          <KidPicker kidProfiles={kidProfiles} selectedKidId={selectedKidId} onSelect={onSelectKid} />

          {kid && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-gray-900">
                  {kid.name}&rsquo;s subjects
                  {tracks && tracks.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      {tracks.filter((t) => t.active).length} on
                    </span>
                  )}
                </h3>
                {!adding && (
                  <button type="button" onClick={() => { setEditingId(null); setAdding(true); }} className={primaryButton}>
                    <Plus className="w-4 h-4" />
                    Add a subject
                  </button>
                )}
              </div>

              {adding && (
                <TrackForm
                  kidProfileId={kid._id}
                  onDone={() => setAdding(false)}
                  onCancel={() => setAdding(false)}
                  showToast={showToast}
                />
              )}

              {tracks === undefined ? (
                <p className="text-sm text-gray-400">Loading&hellip;</p>
              ) : sortedTracks.length === 0 && !adding ? (
                <EmptyState
                  icon={BookOpen}
                  title={`${kid.name} has no subjects yet`}
                  action={
                    <button type="button" onClick={() => setAdding(true)} className={primaryButton}>
                      <Plus className="w-4 h-4" />
                      Add the first subject
                    </button>
                  }
                >
                  Pick a subject and type a handful of topics, one per line. That is the whole setup:
                  tomorrow morning the first one is waiting as a lesson.
                </EmptyState>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {sortedTracks.map((track) =>
                    editingId === track._id ? (
                      <div key={track._id} className="lg:col-span-2">
                        <TrackForm
                          kidProfileId={kid._id}
                          track={track}
                          onDone={() => setEditingId(null)}
                          onCancel={() => setEditingId(null)}
                          showToast={showToast}
                        />
                      </div>
                    ) : (
                      <TrackCard
                        key={track._id}
                        track={track}
                        onEdit={() => { setAdding(false); setEditingId(track._id); }}
                        onDelete={() => setConfirmDelete(track)}
                        showToast={showToast}
                      />
                    ),
                  )}
                </div>
              )}

              {sortedTracks.length > 0 && (
                <p className="text-xs text-gray-500 flex items-start gap-1.5">
                  <Check className="w-3.5 h-3.5 mt-0.5 text-green-500 flex-shrink-0" aria-hidden="true" />
                  Lessons already done stay on {kid.name}&rsquo;s record even if you pause or remove a subject.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={`Remove ${confirmDelete.title}?`}
          message={`This takes the subject off ${kid?.name ?? 'the kid'}'s daily lessons. Lessons they already finished stay on their record.`}
          confirmLabel="Remove"
          confirmVariant="danger"
          onConfirm={async () => {
            const target = confirmDelete;
            setConfirmDelete(null);
            try {
              await deleteTrack({ trackId: target._id, userToken: token ?? undefined });
              showToast?.(`${target.title} removed.`);
            } catch (err) {
              showToast?.(err?.message || 'Could not remove this subject.', 'error');
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
