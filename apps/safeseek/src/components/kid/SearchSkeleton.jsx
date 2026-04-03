import { Loader2 } from 'lucide-react';

export default function SearchSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {/* Searching indicator */}
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Searching...
      </div>

      {/* Quick Answer skeleton */}
      <div className="relative bg-white dark:bg-gray-800 border-l-4 border-l-blue-500 rounded-lg animate-pulse overflow-hidden">
        <div className="absolute inset-0 animate-shimmer" />
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-3/4 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      </div>

      {/* Section card skeletons */}
      {[0, 1].map((i) => {
        const borderColors = ['border-l-gray-300 dark:border-l-gray-600', 'border-l-gray-200 dark:border-l-gray-700'];
        return (
          <div key={i} className={`relative bg-white dark:bg-gray-800 border-l-4 ${borderColors[i]} rounded-lg animate-pulse overflow-hidden`}>
            <div className="absolute inset-0 animate-shimmer" />
            <div className="p-5">
              <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 mb-3" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
                <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
