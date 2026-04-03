import { Loader2 } from 'lucide-react';

export default function ResearchSkeleton() {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finding trusted sources...
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-pulse">
          <div className="px-5 py-3 bg-gray-50 dark:bg-gray-750 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
            <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-600" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-600" />
              <div className="h-2.5 w-1/3 rounded bg-gray-200 dark:bg-gray-600" />
            </div>
          </div>
          <div className="px-5 py-4 space-y-2.5">
            <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-gray-700" />
            <div className="h-3 w-4/5 rounded bg-gray-100 dark:bg-gray-700" />
          </div>
        </div>
      ))}
    </div>
  );
}
