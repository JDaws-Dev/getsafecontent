import { useState, useRef } from 'react';

export default function ImageGallery({ images, onImageClick }) {
  const [failedImages, setFailedImages] = useState(new Set());
  const scrollRef = useRef(null);

  const visibleImages = images.filter((_, i) => !failedImages.has(i));
  const hasWikipediaImages = visibleImages.some((img) => img.source === 'wikipedia');

  const handleError = (index) => {
    setFailedImages((prev) => new Set(prev).add(index));
  };

  if (visibleImages.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Responsive: 1 col if 1 image, 2 cols if 2-4, 3 cols if 5+ */}
      <div
        ref={scrollRef}
        className={`grid gap-3 ${
          visibleImages.length === 1 ? 'grid-cols-1 max-w-md' :
          visibleImages.length <= 4 ? 'grid-cols-2' :
          'grid-cols-2 sm:grid-cols-3'
        }`}
      >
        {images.map((image, index) => {
          if (failedImages.has(index)) return null;
          return (
            <button
              key={index}
              onClick={() => onImageClick(index)}
              className="group relative rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-400 focus:ring-offset-2 active:scale-[0.98]"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={image.thumbnail || image.url}
                  alt={image.title || ''}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => handleError(index)}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              {/* Source badge */}
              {image.source && (
                <span className={`absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded font-semibold shadow-sm ${
                  image.source === 'wikipedia'
                    ? 'bg-white/90 text-accent-700 dark:bg-gray-800/90 dark:text-accent-300'
                    : 'bg-white/90 text-accent-700 dark:bg-gray-800/90 dark:text-accent-300'
                }`}>
                  {image.source === 'wikipedia' ? 'Wiki' : 'SafeStudy'}
                </span>
              )}
              {/* Title caption */}
              {image.title && (
                <div className="px-2 py-1.5 bg-white dark:bg-gray-800">
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate leading-tight">{image.title}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Wikipedia attribution */}
      {hasWikipediaImages && (
        <p className="text-[11px] text-gray-400 pl-1">
          Images from Wikipedia under Creative Commons license
        </p>
      )}
    </div>
  );
}
