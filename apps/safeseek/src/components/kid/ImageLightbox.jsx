import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageLightbox({ images, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const image = images[currentIndex];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while lightbox is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, images.length, onClose]);

  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full mx-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Navigation - left */}
        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex((i) => i - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-14 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition z-10"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Navigation - right */}
        {currentIndex < images.length - 1 && (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-14 text-white/80 hover:text-white p-2 rounded-full bg-black/40 hover:bg-black/60 transition z-10"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {/* Image */}
        <img
          src={image.url}
          alt={image.title || ''}
          className="max-h-[75vh] max-w-full rounded-xl object-contain shadow-2xl"
          referrerPolicy="no-referrer"
        />

        {/* Caption area */}
        <div className="mt-4 text-center px-4">
          {image.title && (
            <p className="text-white text-base font-medium">{image.title}</p>
          )}
          <div className="flex items-center justify-center gap-3 mt-2">
            {image.source && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                image.source === 'wikipedia'
                  ? 'bg-white/15 text-blue-200'
                  : 'bg-white/15 text-cyan-200'
              }`}>
                {image.source === 'wikipedia' ? 'Wikipedia' : 'SafeStudy'}
              </span>
            )}
            <span className="text-white/50 text-xs">
              {currentIndex + 1} of {images.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
