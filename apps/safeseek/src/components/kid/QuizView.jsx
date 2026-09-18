import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ArrowLeft, Loader2, CheckCircle2, ListChecks, Layers, RefreshCw } from 'lucide-react';
import QuestionCard from './QuestionCard';

/**
 * "Quiz me on this": five questions written from the answer the kid just read.
 *
 * The coordinator runs the quiz action and hands the questions here. On submit
 * the raw responses go to `completeQuiz`; the server grades them and returns
 * the score plus a per-question `graded[]`, and that is all the screen shows.
 * Nothing is graded on the client.
 */
export default function QuizView({
  kidProfileId,
  topic,
  subject,
  questions,
  loading,
  error,
  onBack,
  onRetry,
  onReview,
}) {
  const completeQuiz = useMutation(api.progress.completeQuiz);
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null); // { score, total, cardsAdded, graded[] }

  const list = Array.isArray(questions) ? questions : [];
  const allAnswered = list.length > 0 && list.every((_, i) => (responses[i] ?? '').trim() !== '');

  const handleSubmit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    const payload = list.map((q, i) => ({
      prompt: q.prompt,
      answer: q.answer,
      response: (responses[i] ?? '').trim(),
    }));
    try {
      const args = { kidProfileId, topic, questions: payload };
      if (subject) args.subject = subject;
      const res = await completeQuiz(args);
      const serverGraded = Array.isArray(res?.graded) ? res.graded : [];
      setResult({
        score: res?.score ?? 0,
        total: res?.total ?? list.length,
        cardsAdded: res?.cardsAdded ?? 0,
        graded: list.map((q, i) => {
          const g = serverGraded.find((row) => row.index === i) || serverGraded[i] || {};
          return {
            index: i,
            response: g.response ?? payload[i].response,
            correct: !!g.correct,
            answer: g.answer ?? q.answer,
            explanation: q.explanation ?? '',
          };
        }),
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[QuizView] submit failed:', err);
      setSubmitError("We couldn't check your answers just now. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell onBack={onBack}>
        <Title topic={topic} />
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" />
          Writing your quiz...
        </div>
      </Shell>
    );
  }

  if (error || list.length === 0) {
    return (
      <Shell onBack={onBack}>
        <Title topic={topic} />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">
            {error || "We couldn't make a quiz for that right now."}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Try again in a bit.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {onRetry && (
              <button type="button" onClick={onRetry} className={primaryBtn}>
                <RefreshCw className="w-4 h-4" /> Try again
              </button>
            )}
            <button type="button" onClick={onBack} className={secondaryBtn}>
              Back
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  if (result) {
    const perfect = result.score === result.total;
    return (
      <Shell onBack={onBack}>
        <Title topic={topic} done />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center mb-5 animate-fadeIn motion-reduce:animate-none">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
            perfect ? 'bg-green-100 dark:bg-green-900/40' : 'bg-accent-100 dark:bg-accent-900/40'
          }`}>
            <CheckCircle2 className={`w-8 h-8 ${perfect ? 'text-green-600 dark:text-green-400' : 'text-accent-600 dark:text-accent-400'}`} />
          </div>
          <p className="font-display text-3xl font-semibold text-gray-900 dark:text-white">
            {result.score} of {result.total}
          </p>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {perfect
              ? 'Every one right. Nice work!'
              : result.cardsAdded > 0
                ? `Good try. ${result.cardsAdded === 1 ? 'One question' : `${result.cardsAdded} questions`} you missed went into your review deck.`
                : 'Good try. Look at the ones you missed below.'}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button type="button" onClick={onBack} className={primaryBtn}>
              Back to the answer
            </button>
            {result.cardsAdded > 0 && onReview && (
              <button type="button" onClick={onReview} className={secondaryBtn}>
                <Layers className="w-4 h-4" /> Go to review
              </button>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {list.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              total={list.length}
              question={q}
              value={result.graded[i]?.response ?? ''}
              onChange={() => {}}
              disabled
              result={result.graded[i]}
            />
          ))}
        </div>
      </Shell>
    );
  }

  return (
    <Shell onBack={onBack}>
      <Title topic={topic} />
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Five questions about what you just read. Answer them all, then check.
      </p>
      <div className="space-y-3">
        {list.map((q, i) => (
          <QuestionCard
            key={i}
            index={i}
            total={list.length}
            question={q}
            value={responses[i] ?? ''}
            onChange={(val) => {
              setResponses((prev) => {
                const next = [...prev];
                next[i] = val;
                return next;
              });
            }}
            disabled={submitting}
          />
        ))}
      </div>
      {submitError && (
        <p className="text-sm text-orange-600 dark:text-orange-400 mt-4 text-center">{submitError}</p>
      )}
      <div className="mt-5 flex flex-col items-center gap-1">
        <button type="button" onClick={handleSubmit} disabled={!allAnswered || submitting} className={primaryBtn}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Checking
            </>
          ) : (
            <>
              <ListChecks className="w-4 h-4" /> Check my answers
            </>
          )}
        </button>
        {!allAnswered && (
          <p className="text-xs text-gray-400 dark:text-gray-500">Answer every question to check them.</p>
        )}
      </div>
    </Shell>
  );
}

const primaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors motion-reduce:transition-none shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2';
const secondaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-accent-300 dark:hover:border-accent-600 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400';

function Shell({ onBack, children }) {
  return (
    <div className="animate-fadeIn motion-reduce:animate-none">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 rounded-lg px-1 py-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      {children}
    </div>
  );
}

function Title({ topic, done = false }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400 mb-1">
        Quiz{done ? ' · Done' : ''}
      </p>
      <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-white leading-tight">{topic}</h1>
    </div>
  );
}
