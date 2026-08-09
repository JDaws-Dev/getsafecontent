import { Clock } from 'lucide-react';
import { formatHour } from './utils';

// "1h 30m" / "45 min" — the family-wide limit is measured in minutes, unlike
// SafeStudy's own budget which counts searches.
function formatMinutes(mins) {
  if (!mins) return '';
  if (mins < 60) return `${mins} minutes`;
  const hours = Math.floor(mins / 60);
  const remaining = mins % 60;
  if (remaining === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours}h ${remaining}m`;
}

export default function TimeLimitModal({ canSearchStatus, onDismiss }) {
  // Reasons come from convex/timeLimits.ts canSearch.
  const isOutsideHours = canSearchStatus?.reason === 'outside_hours';
  // One limit shared with the other Safe Family apps — the time may well have
  // been spent somewhere else, so the wording can't say "your searches".
  const isFamilyLimit = canSearchStatus?.reason === 'family_limit_reached';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
          isOutsideHours ? 'bg-accent-100 dark:bg-accent-900/40' : 'bg-orange-100 dark:bg-orange-900/40'
        }`}>
          <Clock className={`w-8 h-8 ${isOutsideHours ? 'text-accent-500' : 'text-orange-500'}`} />
        </div>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          {isOutsideHours ? 'Not Search Time Yet' : "Time's Up!"}
        </h2>

        <p className="text-gray-600 dark:text-gray-300 mb-2">
          {isOutsideHours
            ? "It's outside your allowed search hours right now."
            : isFamilyLimit
              ? "You've used all your screen time for today."
              : "You've used all your searches for today."}
        </p>

        {isOutsideHours && canSearchStatus?.allowedStart !== undefined && canSearchStatus?.allowedEnd !== undefined && (
          <p className="text-sm text-accent-600 dark:text-accent-400 font-medium mb-6">
            Come back between {formatHour(canSearchStatus.allowedStart)} and {formatHour(canSearchStatus.allowedEnd)}!
          </p>
        )}

        {isFamilyLimit && (
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-6">
            {canSearchStatus?.limitMinutes
              ? `Your ${formatMinutes(canSearchStatus.limitMinutes)} a day covers all your Safe Family apps. Come back tomorrow!`
              : 'Come back tomorrow!'}
          </p>
        )}

        {!isOutsideHours && !isFamilyLimit && canSearchStatus?.dailyLimit !== undefined && (
          <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-6">
            You've done {canSearchStatus.dailyLimit} searches today. Come back tomorrow!
          </p>
        )}

        {!isOutsideHours && !isFamilyLimit && canSearchStatus?.dailyLimit === undefined && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Come back tomorrow for more exploring!</p>
        )}

        <button
          onClick={onDismiss}
          className="w-full bg-accent-600 hover:bg-accent-700 text-white py-3 rounded-lg font-medium text-lg transition-all duration-200 active:scale-[0.98]"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
