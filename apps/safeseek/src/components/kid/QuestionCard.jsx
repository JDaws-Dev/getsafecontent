import { Check, X } from 'lucide-react';

/**
 * One question, used by both the lesson check and "Quiz me".
 *
 * Two shapes come from the server: "choice" (tap one of the options) and
 * "short" (type a word or a number). Before grading it collects an answer;
 * after grading (`result` set) it shows whether it was right, the real answer,
 * and the one-line explanation.
 */
export default function QuestionCard({
  index,
  total,
  question,
  value,
  onChange,
  disabled = false,
  result = null,
}) {
  const isChoice = question.kind === 'choice' && Array.isArray(question.choices) && question.choices.length >= 2;
  const inputId = `question-${index}`;
  const graded = result != null;

  const frame = graded
    ? result.correct
      ? 'border-green-300 dark:border-green-700 border-l-4 border-l-green-500'
      : 'border-orange-300 dark:border-orange-700 border-l-4 border-l-orange-500'
    : 'border-gray-200 dark:border-gray-700 border-l-4 border-l-accent-400';

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${frame} p-5`}>
      <div className="flex items-start gap-3 mb-3">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-300 text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            Question {index + 1} of {total}
          </p>
          <label htmlFor={isChoice ? undefined : inputId} className="block text-base font-semibold text-gray-900 dark:text-white leading-snug">
            {question.prompt}
          </label>
        </div>
        {graded && (
          <span
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              result.correct
                ? 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'
                : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
            }`}
            aria-label={result.correct ? 'Correct' : 'Not quite'}
          >
            {result.correct ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </span>
        )}
      </div>

      {isChoice ? (
        <div role="radiogroup" aria-label={`Choices for question ${index + 1}`} className="grid gap-2 sm:grid-cols-2">
          {question.choices.map((choice, i) => {
            const selected = value === choice;
            const isAnswer = graded && choice === result.answer;
            let look = 'border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-accent-300 dark:hover:border-accent-600';
            if (graded) {
              if (isAnswer) look = 'border-green-400 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200';
              else if (selected) look = 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200';
              else look = 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400';
            } else if (selected) {
              look = 'border-accent-500 bg-accent-50 dark:bg-accent-900/30 text-accent-800 dark:text-accent-200';
            }
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled || graded}
                onClick={() => onChange(choice)}
                className={`text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 disabled:cursor-default ${look}`}
              >
                {choice}
              </button>
            );
          })}
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || graded}
          placeholder="Type your answer"
          autoComplete="off"
          className={`w-full text-[16px] rounded-xl border px-4 py-3 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent-200 dark:focus:ring-accent-500/30 focus:border-accent-400 disabled:opacity-80 ${
            graded
              ? result.correct
                ? 'border-green-400'
                : 'border-orange-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
        />
      )}

      {graded && (
        <div className="mt-3 text-sm space-y-1">
          {!result.correct && (
            <p className="text-gray-800 dark:text-gray-200">
              <span className="font-semibold">The answer:</span> {result.answer}
            </p>
          )}
          {result.explanation && (
            <p className="text-gray-600 dark:text-gray-400">{result.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}
