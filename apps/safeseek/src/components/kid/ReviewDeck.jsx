import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  ArrowLeft, Layers, Check, X, Loader2, Eye, CheckCircle2, ArrowRight,
} from 'lucide-react';
import ReadAloudButton from './ReadAloudButton';
import { subjectLabel, isYoungKid } from './utils';

/**
 * The review deck: one card at a time, graded by the server, done in a couple
 * of minutes.
 *
 * The due-card query is live, and a graded card stops being due the moment the
 * server answers, so the list is snapshotted once when it first arrives — the
 * deck the kid started with is the deck they finish. `finishSession` is called
 * exactly once, with the totals, when the kid reaches the end or leaves early.
 */
export default function ReviewDeck({ kidProfileId, profile, onBack }) {
  const dueCards = useQuery(api.review.getDueCards, kidProfileId ? { kidProfileId } : 'skip');
  const gradeCard = useMutation(api.review.gradeCard);
  const finishSession = useMutation(api.review.finishSession);

  const [cards, setCards] = useState(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [verdict, setVerdict] = useState(null); // { correct, answer, nextInDays, retired }
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const finishedRef = useRef(false);
  const totalsRef = useRef({ reviewed: 0, correct: 0 });
  const inputRef = useRef(null);

  const young = isYoungKid(profile);

  // Snapshot the deck once.
  useEffect(() => {
    if (cards === null && Array.isArray(dueCards)) {
      setCards(dueCards);
    }
  }, [dueCards, cards]);

  useEffect(() => {
    totalsRef.current = { reviewed, correct };
  }, [reviewed, correct]);

  // Focus the answer box on each new card (typing mode only).
  useEffect(() => {
    if (!young && !verdict && inputRef.current) inputRef.current.focus();
  }, [index, verdict, young]);

  const closeOut = () => {
    if (finishedRef.current) return;
    const t = totalsRef.current;
    // Nothing graded yet means nothing to record — and the flag stays clear so
    // a dev-mode double mount can't swallow the real finish later.
    if (t.reviewed <= 0) return;
    finishedRef.current = true;
    finishSession({ kidProfileId, reviewed: t.reviewed, correct: t.correct }).catch((err) => {
      console.error('[ReviewDeck] finishSession failed:', err);
    });
  };

  // Leaving mid-session still records what was done.
  useEffect(() => () => closeOut(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const card = cards?.[index];
  const total = cards?.length ?? 0;

  const submit = async (response) => {
    if (!card || grading || verdict) return;
    setGrading(true);
    setGradeError('');
    try {
      const res = await gradeCard({ cardId: card._id, kidProfileId, response });
      setVerdict(res);
      setReviewed((n) => n + 1);
      if (res.correct) setCorrect((n) => n + 1);
    } catch (err) {
      console.error('[ReviewDeck] grade failed:', err);
      setGradeError("We couldn't check that one. Try again.");
    } finally {
      setGrading(false);
    }
  };

  const next = () => {
    setVerdict(null);
    setTyped('');
    setRevealed(false);
    setGradeError('');
    if (index + 1 >= total) {
      setFinished(true);
      closeOut();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const handleBack = () => {
    closeOut();
    onBack();
  };

  // ----- Loading -----
  if (cards === null) {
    return (
      <Shell onBack={handleBack}>
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" />
          Shuffling your cards...
        </div>
      </Shell>
    );
  }

  // ----- Nothing due -----
  if (total === 0) {
    return (
      <Shell onBack={handleBack}>
        <Heading />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Nothing to review right now.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            Finish a lesson or take a quiz and new cards will show up here.
          </p>
          <button type="button" onClick={handleBack} className={primaryBtn}>
            Back home
          </button>
        </div>
      </Shell>
    );
  }

  // ----- Summary -----
  if (finished) {
    const allRight = correct === reviewed && reviewed > 0;
    return (
      <Shell onBack={handleBack}>
        <Heading />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center animate-fadeIn motion-reduce:animate-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            allRight ? 'bg-green-100 dark:bg-green-900/40' : 'bg-accent-100 dark:bg-accent-900/40'
          }`}>
            <CheckCircle2 className={`w-8 h-8 ${allRight ? 'text-green-600 dark:text-green-400' : 'text-accent-600 dark:text-accent-400'}`} />
          </div>
          <p className="font-display text-3xl font-semibold text-gray-900 dark:text-white">
            {correct} of {reviewed}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {allRight
              ? 'You remembered every one. Review done!'
              : 'Review done. The ones you missed will come back tomorrow.'}
          </p>
          <button type="button" onClick={handleBack} className={primaryBtn + ' mt-5'}>
            Back home
          </button>
        </div>
      </Shell>
    );
  }

  // ----- One card -----
  const progressPct = Math.round((index / total) * 100);
  return (
    <Shell onBack={handleBack}>
      <Heading />

      <div className="flex items-center gap-3 mb-4" aria-label={`Card ${index + 1} of ${total}`}>
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-accent-500 rounded-full transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
          {index + 1} / {total}
        </span>
      </div>

      <div
        key={card._id}
        className={`bg-white dark:bg-gray-800 rounded-2xl border p-6 animate-fadeIn motion-reduce:animate-none ${
          verdict
            ? verdict.correct
              ? 'border-green-300 dark:border-green-700'
              : 'border-orange-300 dark:border-orange-700'
            : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {(card.subject || card.topic) && (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400 mb-2">
            {[subjectLabel(card.subject), card.topic].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-start gap-2 mb-5">
          <p className="flex-1 text-lg font-semibold text-gray-900 dark:text-white leading-snug">{card.question}</p>
          <ReadAloudButton
            text={card.question}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            iconSize="w-4 h-4"
          />
        </div>

        {/* Answer area */}
        {!verdict && !young && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) submit(typed.trim());
            }}
            className="space-y-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={grading}
              placeholder="Type your answer"
              autoComplete="off"
              className="w-full text-[16px] rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:border-accent-400"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!typed.trim() || grading} className={primaryBtn}>
                {grading ? <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> : <Check className="w-4 h-4" />}
                Check
              </button>
              <button
                type="button"
                onClick={() => submit('')}
                disabled={grading}
                className={secondaryBtn}
              >
                <Eye className="w-4 h-4" /> I don't remember
              </button>
            </div>
          </form>
        )}

        {!verdict && young && !revealed && (
          <button type="button" onClick={() => setRevealed(true)} className={primaryBtn + ' w-full justify-center py-3 text-base'}>
            <Eye className="w-5 h-5" /> Show me the answer
          </button>
        )}

        {!verdict && young && revealed && (
          <div className="space-y-4">
            <div className="rounded-xl bg-accent-50 dark:bg-accent-900/20 border border-accent-100 dark:border-accent-800 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">The answer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{card.answer}</p>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Did you know it?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => submit(card.answer)}
                disabled={grading}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-base transition-colors motion-reduce:transition-none active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2"
              >
                <Check className="w-5 h-5" /> I knew it
              </button>
              <button
                type="button"
                onClick={() => submit('')}
                disabled={grading}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 font-medium text-base hover:border-orange-300 transition-colors motion-reduce:transition-none active:scale-[0.98] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
              >
                <X className="w-5 h-5" /> Not yet
              </button>
            </div>
          </div>
        )}

        {gradeError && (
          <p className="text-sm text-orange-600 dark:text-orange-400 mt-3">{gradeError}</p>
        )}

        {verdict && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 font-semibold ${
              verdict.correct ? 'text-green-700 dark:text-green-300' : 'text-orange-700 dark:text-orange-300'
            }`}>
              {verdict.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
              {verdict.correct ? 'You got it!' : 'Not quite.'}
            </div>
            {!verdict.correct && (
              <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">The answer</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{verdict.answer}</p>
              </div>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {verdict.retired
                ? 'You know this one so well it can rest now.'
                : verdict.correct
                  ? `You'll see this one again in ${verdict.nextInDays === 1 ? 'a day' : `${verdict.nextInDays} days`}.`
                  : "It'll come back tomorrow."}
            </p>
            <button type="button" onClick={next} autoFocus className={primaryBtn + ' w-full justify-center'}>
              {index + 1 >= total ? 'Finish' : 'Next card'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </Shell>
  );
}

const primaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors motion-reduce:transition-none shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2';
const secondaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-accent-300 dark:hover:border-accent-600 text-sm font-medium transition-colors motion-reduce:transition-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400';

function Shell({ onBack, children }) {
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
      {children}
    </div>
  );
}

function Heading() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 rounded-lg bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center">
        <Layers className="w-4 h-4 text-accent-600 dark:text-accent-400" />
      </div>
      <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-white">Review</h1>
    </div>
  );
}
