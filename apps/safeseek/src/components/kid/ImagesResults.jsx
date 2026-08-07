import { Camera, ChevronRight } from 'lucide-react';
import { stripMarkdown } from './utils';

// Hard client cap matching backend cap (search.ts deduplicateImages limit=6).
// Defensive: if the backend ever raises the cap, kid still doesn't get a feed.
const MAX_IMAGES = 6;

export default function ImagesResults({ images, aiSummary, onImageClick, onSwitchToLearn }) {
  const cappedImages = images.slice(0, MAX_IMAGES);
  if (cappedImages.length > 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {cappedImages.map((image, index) => (
            <button
              key={index}
              onClick={() => onImageClick(index)}
              className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-400 aspect-[4/3] active:scale-[0.98]"
            >
              <img
                src={image.thumbnail || image.url}
                alt={image.title || ''}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {image.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs truncate">{image.title}</p>
                </div>
              )}
            </button>
          ))}
        </div>
        {/* Brief AI summary below images */}
        {aiSummary && (
          <div className="bg-accent-50 dark:bg-accent-900/20 border border-accent-100 dark:border-accent-800/50 rounded-lg p-4">
            <p className="text-sm text-accent-800 dark:text-accent-200 leading-relaxed line-clamp-3">{stripMarkdown(aiSummary)}</p>
            <button
              onClick={onSwitchToLearn}
              className="text-xs text-accent-600 dark:text-accent-400 font-medium mt-2 hover:underline py-1"
            >
              Read full answer &rarr;
            </button>
          </div>
        )}
      </div>
    );
  }

  // Empty state for Images mode
  return (
    <div className="text-center py-16">
      <Camera className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-2">No images found</h3>
      <p className="text-gray-400 dark:text-gray-500 text-sm max-w-xs mx-auto mb-5">
        Try searching for animals, planets, volcanoes, or anything you're curious about.
      </p>
      <button
        onClick={onSwitchToLearn}
        className="text-sm text-accent-600 dark:text-accent-400 font-medium hover:underline py-1 inline-flex items-center gap-1"
      >
        Switch to Learn mode <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
