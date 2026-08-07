import { History, Clock } from 'lucide-react';
import { formatRelativeTime } from './utils';

export default function SearchHistoryPanel({ kidSearchHistory, onClose, onSelectQuery }) {
  if (!kidSearchHistory || kidSearchHistory.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <History className="w-4 h-4" />
          Recent Searches
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          Close
        </button>
      </div>
      <div className="space-y-1">
        {kidSearchHistory.filter((entry, index, arr) => {
          // Deduplicate by query text, keeping only the most recent (first) occurrence
          return arr.findIndex((e) => e.query.toLowerCase() === entry.query.toLowerCase()) === index;
        }).map((entry) => (
          <button
            key={entry._id}
            onClick={() => onSelectQuery(entry.query)}
            className="w-full text-left px-3 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-accent-50 dark:hover:bg-accent-900/20 hover:text-accent-700 dark:hover:text-accent-300 rounded-xl transition-all duration-200 flex items-center gap-2 active:scale-[0.98]"
          >
            <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
            <span className="truncate flex-1">{entry.query}</span>
            {entry._creationTime && (
              <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                {formatRelativeTime(entry._creationTime)}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
