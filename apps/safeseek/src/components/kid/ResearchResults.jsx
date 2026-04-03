import { Shield, BookOpen, ChevronRight } from 'lucide-react';
import ResearchCard from './ResearchCard';
import ResearchSkeleton from './ResearchSkeleton';

export default function ResearchResults({
  researchResults,
  researchLoading,
  hasResults,
  onSwitchToLearn,
}) {
  return (
    <div className="space-y-4">
      {researchLoading && <ResearchSkeleton />}
      {!researchLoading && researchResults.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-500" />
            {researchResults.length} verified source{researchResults.length !== 1 ? 's' : ''} found
          </p>
          {researchResults.map((source, index) => (
            <ResearchCard key={index} source={source} />
          ))}
        </div>
      )}
      {!researchLoading && researchResults.length === 0 && hasResults && (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">No articles found</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs mx-auto mb-5">
            Try a different topic like animals, space, history, or science.
          </p>
          <button
            onClick={onSwitchToLearn}
            className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline py-1 inline-flex items-center gap-1"
          >
            Switch to Learn mode <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {!researchLoading && !hasResults && (
        <div className="text-center py-16">
          <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">Read real articles about any topic</h3>
          <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto">
            Search for a topic, then tap Research to read real articles about it.
          </p>
        </div>
      )}
    </div>
  );
}
