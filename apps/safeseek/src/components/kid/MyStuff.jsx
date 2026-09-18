import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  ArrowLeft, Bookmark, BookOpen, ListChecks, Trash2, Loader2, ChevronDown, ChevronUp,
} from 'lucide-react';
import { parseJsonSafe, subjectLabel, formatShelfDate } from './utils';

const KIND_META = {
  lesson: { label: 'Lesson', Icon: BookOpen, tone: 'bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300' },
  quiz: { label: 'Quiz', Icon: ListChecks, tone: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  answer: { label: 'Kept answer', Icon: Bookmark, tone: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
};

/**
 * My Stuff: the shelf of things the kid finished — lessons, quizzes and answers
 * they chose to keep. Newest first. This is deliberately not a search log.
 */
export default function MyStuff({ kidProfileId, onBack, onOpenLesson }) {
  const items = useQuery(api.progress.getSavedItems, kidProfileId ? { kidProfileId, limit: 60 } : 'skip');
  const removeItem = useMutation(api.progress.removeSavedItem);
  const [removing, setRemoving] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [open, setOpen] = useState(null);

  const handleRemove = async (itemId) => {
    setRemoving(itemId);
    try {
      await removeItem({ itemId, kidProfileId });
    } catch (err) {
      console.error('[MyStuff] remove failed:', err);
    } finally {
      setRemoving(null);
      setConfirming(null);
    }
  };

  return (
    <div className="animate-fadeIn motion-reduce:animate-none">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 rounded-lg px-1 py-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Home
      </button>

      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <Bookmark className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">My Stuff</h1>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Lessons you finished, quizzes you took, and answers you kept.
      </p>

      {items === undefined && (
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" />
          Getting your shelf...
        </div>
      )}

      {Array.isArray(items) && items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Nothing here yet.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Finish a lesson, take a quiz, or tap "Keep this" on an answer you like.
          </p>
        </div>
      )}

      {Array.isArray(items) && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => {
            const meta = KIND_META[item.kind] || KIND_META.answer;
            const body = parseJsonSafe(item.body, {}) || {};
            const hasScore = typeof body.score === 'number' && typeof body.total === 'number';
            const isOpen = open === item._id;
            const isConfirming = confirming === item._id;
            const Icon = meta.Icon;
            return (
              <li
                key={item._id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${meta.tone}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-semibold">{meta.label}</span>
                      {item.subject && <span>&middot; {subjectLabel(item.subject)}</span>}
                      <span>&middot; {formatShelfDate(item.createdAt)}</span>
                      {hasScore && (
                        <span className="ml-auto font-medium text-gray-700 dark:text-gray-200">
                          {body.score} of {body.total}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white mt-0.5 break-words">{item.title}</p>

                    {item.kind === 'answer' && body.summary && (
                      <div className="mt-1">
                        <p className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
                          {body.summary}
                        </p>
                        {body.summary.length > 140 && (
                          <button
                            type="button"
                            onClick={() => setOpen(isOpen ? null : item._id)}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-accent-600 dark:text-accent-400 hover:text-accent-700 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                          >
                            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            {isOpen ? 'Show less' : 'Read it all'}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {item.kind === 'lesson' && body.lessonId && onOpenLesson && (
                        <button
                          type="button"
                          onClick={() => onOpenLesson(body.lessonId)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-900/50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                        >
                          Look at it again
                        </button>
                      )}
                      {isConfirming ? (
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span className="text-gray-600 dark:text-gray-300">Take it off the shelf?</span>
                          <button
                            type="button"
                            onClick={() => handleRemove(item._id)}
                            disabled={removing === item._id}
                            className="font-medium px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/60 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                          >
                            {removing === item._id ? 'Removing' : 'Yes, remove'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirming(null)}
                            className="font-medium px-3 py-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                          >
                            Keep it
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirming(item._id)}
                          className="ml-auto inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-orange-600 dark:hover:text-orange-400 rounded px-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
                          aria-label={`Remove ${item.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
