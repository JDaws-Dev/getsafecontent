import { Sparkles, Search, AlertCircle } from 'lucide-react';
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
}) {
  return (
    <div className="space-y-5">
      {/* AI Answer — clean card with left blue border */}
      {aiSummary && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 border-l-blue-500 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Answer</h2>
            <ReadAloudButton
              text={aiSummary}
              className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              iconSize="w-4 h-4"
            />
          </div>
          <ExpandableSummary text={aiSummary} />
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
              className="flex items-center justify-center px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition"
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
              'border-l-gray-300 dark:border-l-gray-600',
              'border-l-blue-300 dark:border-l-blue-700',
              'border-l-teal-300 dark:border-l-teal-700',
              'border-l-amber-300 dark:border-l-amber-700',
              'border-l-purple-300 dark:border-l-purple-700',
            ];
            const mutedBorder = borderMuted[index % borderMuted.length];
            return (
              <div key={index} className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 border-l-4 ${mutedBorder} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <button
                      onClick={() => onSuggestionClick(rootQuery + ' ' + section.heading)}
                      className="hover:text-blue-600 dark:hover:text-blue-400 text-left flex-1 transition-colors"
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
                className="w-full text-left px-4 py-2.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 flex items-center gap-2"
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
