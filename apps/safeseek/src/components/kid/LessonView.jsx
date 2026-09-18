import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
  ArrowLeft, BookOpen, CheckCircle2, Loader2, RefreshCw, GraduationCap, ListChecks,
} from 'lucide-react';
import QuestionCard from './QuestionCard';
import ReadAloudButton from './ReadAloudButton';
import DiagramCard from './DiagramCard';
import { parseJsonSafe, subjectLabel, friendlyFailure } from './utils';

/**
 * Today's lesson, start to finish: read the explainer, answer the five
 * questions, see the score. Grading is the server's (`completeLesson`) — this
 * screen only collects answers and shows what came back.
 *
 * A lesson row with no body yet (generation failed, or still running) gets a
 * plain "getting this ready" card with a retry.
 */
export default function LessonView({ lessonId, onBack, onRetry, onAskTutor }) {
  const lesson = useQuery(api.lessonQueries.getLesson, lessonId ? { lessonId } : 'skip');
  const markStarted = useMutation(api.lessonQueries.markLessonStarted);
  const completeLesson = useMutation(api.lessonQueries.completeLesson);

  const [step, setStep] = useState('read'); // 'read' | 'questions' | 'result'
  const [responses, setResponses] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [result, setResult] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState('');
  const startedRef = useRef(null);

  const content = parseJsonSafe(lesson?.content, null);
  const questions = parseJsonSafe(lesson?.questions, []);
  const hasBody = !!(content && content.intro && Array.isArray(content.sections) && content.sections.length > 0);

  // Reset when the lesson changes (retry hands us a fresh id).
  // Declared first so it runs before the "already finished" effect below.
  useEffect(() => {
    setStep('read');
    setResponses([]);
    setResult(null);
    setSubmitError('');
    setRetryMessage('');
  }, [lessonId]);

  // Mark the lesson started the first time the kid opens it (once per lesson).
  useEffect(() => {
    if (!lesson?._id || !hasBody) return;
    if (startedRef.current === lesson._id) return;
    startedRef.current = lesson._id;
    if (lesson.status === 'assigned') {
      markStarted({ lessonId: lesson._id }).catch(() => {
        /* cosmetic — the finish still counts */
      });
    }
  }, [lesson?._id, lesson?.status, hasBody, markStarted]);

  // A lesson that is already finished opens straight on its result, rebuilt
  // from the stored answers.
  useEffect(() => {
    if (!lesson || lesson.status !== 'complete' || result) return;
    const stored = parseJsonSafe(lesson.answers, []);
    if (!Array.isArray(stored) || questions.length === 0) return;
    setResult({
      score: lesson.score ?? stored.filter((g) => g.correct).length,
      total: questions.length,
      graded: questions.map((q, i) => {
        const g = stored.find((s) => s.index === i) || {};
        return {
          index: i,
          response: g.response ?? '',
          correct: !!g.correct,
          answer: q.answer,
          explanation: q.explanation ?? '',
        };
      }),
    });
    setStep('result');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?._id, lesson?.status, lesson?.answers]);

  const allAnswered = questions.length > 0 && questions.every((_, i) => (responses[i] ?? '').trim() !== '');

  const handleSubmit = async () => {
    if (!lesson?._id || submitting || !allAnswered) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const graded = await completeLesson({
        lessonId: lesson._id,
        responses: questions.map((_, i) => (responses[i] ?? '').trim()),
      });
      setResult(graded);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('[LessonView] submit failed:', err);
      setSubmitError("We couldn't check your answers just now. Try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = async () => {
    if (!lesson || retrying || !onRetry) return;
    setRetrying(true);
    setRetryMessage('');
    try {
      const res = await onRetry(lesson);
      if (res?.error && !res?.opened) {
        setRetryMessage(friendlyFailure(res.error, 'this lesson'));
      }
    } finally {
      setRetrying(false);
    }
  };

  // ----- Loading / missing -----
  if (lesson === undefined) {
    return (
      <Shell onBack={onBack}>
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin motion-reduce:animate-none" />
          Opening your lesson...
        </div>
      </Shell>
    );
  }

  if (lesson === null) {
    return (
      <Shell onBack={onBack}>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <p className="text-gray-700 dark:text-gray-300">We couldn't find that lesson.</p>
          <button type="button" onClick={onBack} className={primaryBtn + ' mt-4'}>
            Back home
          </button>
        </div>
      </Shell>
    );
  }

  if (!hasBody) {
    return (
      <Shell onBack={onBack}>
        <LessonTitle lesson={lesson} />
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-accent-100 dark:bg-accent-900/40 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-accent-600 dark:text-accent-400" />
          </div>
          <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">This lesson isn't ready yet.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            We're still getting it together. You can try again now, or come back in a bit.
          </p>
          {retryMessage && (
            <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">{retryMessage}</p>
          )}
          <button type="button" onClick={handleRetry} disabled={retrying} className={primaryBtn}>
            {retrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Getting it ready
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" /> Try again
              </>
            )}
          </button>
        </div>
      </Shell>
    );
  }

  // ----- Result -----
  if (step === 'result' && result) {
    const missed = result.graded.filter((g) => !g.correct);
    const perfect = missed.length === 0;
    return (
      <Shell onBack={onBack}>
        <LessonTitle lesson={lesson} done />
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
              ? 'You got every one. Lesson done!'
              : missed.length === 1
                ? 'Lesson done. One to look at again below.'
                : `Lesson done. ${missed.length} to look at again below.`}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button type="button" onClick={onBack} className={primaryBtn}>
              Back home
            </button>
            {!perfect && onAskTutor && (
              <button type="button" onClick={() => onAskTutor(lesson.topic)} className={secondaryBtn}>
                <GraduationCap className="w-4 h-4" /> Ask the tutor about this
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              total={questions.length}
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

  // ----- Questions -----
  if (step === 'questions') {
    return (
      <Shell onBack={() => setStep('read')} backLabel="Back to the lesson">
        <LessonTitle lesson={lesson} />
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Answer all {questions.length}, then check them. You can scroll up to read the lesson again any time.
        </p>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={i}
              index={i}
              total={questions.length}
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
        <div className="mt-5 flex flex-wrap justify-center gap-2">
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
            <p className="w-full text-center text-xs text-gray-400 dark:text-gray-500 mt-1">
              Answer every question to check them.
            </p>
          )}
        </div>
      </Shell>
    );
  }

  // ----- Read -----
  const keyPoints = Array.isArray(content.keyPoints) ? content.keyPoints : [];
  return (
    <Shell onBack={onBack}>
      <LessonTitle lesson={lesson} />

      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-accent-500 rounded-lg p-5 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="w-4 h-4 text-accent-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Let's start</h2>
          <ReadAloudButton
            text={content.intro}
            className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            iconSize="w-4 h-4"
          />
        </div>
        <p className="text-gray-800 dark:text-gray-200 leading-relaxed">{content.intro}</p>
      </div>

      {content.diagram && content.diagram !== 'null' && <DiagramCard code={content.diagram} />}

      <div className="space-y-3 mb-4">
        {content.sections.map((section, i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 border-l-accent-300 dark:border-l-accent-700 overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex-1">{section.heading}</h3>
              <ReadAloudButton
                text={section.body}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                iconSize="w-3.5 h-3.5"
              />
            </div>
            <p className="px-5 py-4 text-gray-700 dark:text-gray-300 leading-relaxed text-sm">{section.body}</p>
          </div>
        ))}
      </div>

      {keyPoints.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-5 mb-5">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3">Remember</p>
          <ul className="space-y-2">
            {keyPoints.map((point, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300 text-sm flex items-start gap-2.5">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">&bull;</span>
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {questions.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setStep('questions');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={primaryBtn}
          >
            <ListChecks className="w-4 h-4" /> I'm ready for the questions
          </button>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">This lesson has no questions. Nice reading!</p>
        )}
        {onAskTutor && (
          <button type="button" onClick={() => onAskTutor(lesson.topic)} className={secondaryBtn}>
            <GraduationCap className="w-4 h-4" /> I'm stuck, ask the tutor
          </button>
        )}
      </div>
    </Shell>
  );
}

const primaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors motion-reduce:transition-none shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2';
const secondaryBtn =
  'inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-accent-300 dark:hover:border-accent-600 text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400';

function Shell({ onBack, backLabel = 'Home', children }) {
  return (
    <div className="animate-fadeIn motion-reduce:animate-none">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-4 rounded-lg px-1 py-1 -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>
      {children}
    </div>
  );
}

function LessonTitle({ lesson, done = false }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-600 dark:text-accent-400 mb-1">
        {subjectLabel(lesson.subject)}
        {done ? ' · Done' : ''}
      </p>
      <h1 className="font-display text-2xl font-semibold text-gray-900 dark:text-white leading-tight">
        {lesson.topic}
      </h1>
    </div>
  );
}
