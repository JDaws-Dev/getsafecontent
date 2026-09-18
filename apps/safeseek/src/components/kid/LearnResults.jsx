import { Sparkles, Search, AlertCircle, ListChecks, Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import ExpandableSummary from './ExpandableSummary';
import ReadAloudButton from './ReadAloudButton';
import ExpandableSection from './ExpandableSection';
import DiagramCard from './DiagramCard';
import { getBorderColorClass } from './utils';

export default function LearnResults({
  aiSummary,
  sections,
  funFacts,
  relatedQuestions,
  images,
  diagram,
  rootQuery,
  selectedProfile,
  expandAction,
  onSuggestionClick,
  onImageClick,
  onSwitchToImages,
  // Daily program hooks: turn a finished answer into a quiz, or keep it on the
  // kid's My Stuff shelf. Either is optional so the component still works
  // wherever it is rendered without them.
  onQuizMe,
  onKeep,
  keepState = 'idle', // 'idle' | 'saving' | 'kept'
}) {
  return (
    <div className="space-y-5">
      {/* AI Answer — clean card with left blue border */}
      {aiSummary && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-accent-500 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-accent-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Answer</h2>
            <ReadAloudButton
              text={aiSummary}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              iconSize="w-4 h-4"
            />
          </div>
          <ExpandableSummary text={aiSummary} />

          {(onQuizMe || onKeep) && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2">
              {onQuizMe && (
                <button
                  type="button"
                  onClick={onQuizMe}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-600 hover:bg-accent-700 text-white text-sm font-medium transition-colors motion-reduce:transition-none shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2"
                >
                  <ListChecks className="w-4 h-4" />
                  Quiz me on this
                </button>
              )}
              {onKeep && (
                <button
                  type="button"
                  onClick={onKeep}
                  disabled={keepState !== 'idle'}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-medium transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 ${
                    keepState === 'kept'
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-accent-300 dark:hover:border-accent-600 disabled:opacity-60'
                  }`}
                >
                  {keepState === 'kept' ? (
                    <BookmarkCheck className="w-4 h-4" />
                  ) : keepState === 'saving' ? (
                    <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                  {keepState === 'kept' ? 'Kept in My Stuff' : keepState === 'saving' ? 'Keeping' : 'Keep this'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Inline images — just 2 in Learn mode (full gallery in Images tab) */}
      {images.length > 0 && selectedProfile?.allowImageSearch !== false && (
        <div className="flex gap-3">
          {images.slice(0, 2).map((image, index) => (
            <button
              key={index}
              onClick={() => onImageClick(index)}
              className="flex-1 max-w-[200px] group relative rounded-xl overflow-hidden shadow-sm hover:shadow-md transition bg-gray-100 aspect-[4/3]"
            >
              <img
                src={image.thumbnail || image.url}
                alt={image.title || ''}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </button>
          ))}
          {images.length > 2 && (
            <button
              onClick={onSwitchToImages}
              className="flex items-center justify-center px-4 py-2 text-sm text-accent-600 hover:text-accent-700 font-medium transition"
            >
              +{images.length - 2} more &rarr;
            </button>
          )}
        </div>
      )}

      {/* Visual Diagram */}
      {diagram && diagram !== 'null' && (
        <DiagramCard code={diagram} />
      )}

      {/* Sections — clean white cards with subtle left border */}
      {sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section, index) => {
            const borderColor = getBorderColorClass(index);
            const borderMuted = [
              'border-l-accent-300 dark:border-l-accent-700',
              'border-l-accent-200 dark:border-l-accent-800',
              'border-l-accent-400 dark:border-l-accent-600',
              'border-l-accent-200 dark:border-l-accent-800',
              'border-l-accent-300 dark:border-l-accent-700',
            ];
            const mutedBorder = borderMuted[index % borderMuted.length];
            return (
              <div key={index} className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${mutedBorder} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <button
                      onClick={() => onSuggestionClick(rootQuery + ' ' + section.heading)}
                      className="hover:text-accent-600 dark:hover:text-accent-400 text-left flex-1 transition-colors"
                      title={`Search "${section.heading}"`}
                    >
                      {section.heading}
                    </button>
                    <ReadAloudButton
                      text={section.content}
                      className="ml-auto p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      iconSize="w-3.5 h-3.5"
                    />
                  </h3>
                </div>
                <ExpandableSection
                  content={section.content}
                  heading={section.heading}
                  rootQuery={rootQuery}
                  borderColor={borderColor}
                  onDeepDive={(q) => onSuggestionClick(q)}
                  expandAction={expandAction}
                  kidProfileId={selectedProfile?._id}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Fun Facts — subtle callout */}
      {funFacts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-5">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-3 flex items-center gap-2">
            Did you know?
          </p>
          <ul className="space-y-2.5">
            {funFacts.map((fact, index) => (
              <li key={index} className="text-gray-700 dark:text-gray-300 leading-relaxed flex items-start gap-2.5 text-sm">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">&bull;</span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Related Questions — simple text links */}
      {relatedQuestions.length > 0 && (
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm mb-3">
            Related searches
          </p>
          <div className="space-y-1">
            {relatedQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => onSuggestionClick(q)}
                className="w-full text-left px-4 py-2.5 text-sm text-accent-600 dark:text-accent-400 hover:text-accent-700 dark:hover:text-accent-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No content */}
      {!aiSummary && sections.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            No results found. Try searching for something different!
          </p>
        </div>
      )}
    </div>
  );
}
