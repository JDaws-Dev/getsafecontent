import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show CTA after scrolling 300px down
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isDismissed) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 md:hidden ${
        isVisible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="bg-gradient-to-r from-[#F5A962] to-[#E88B6A] text-white px-4 py-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <p className="font-bold text-sm">
              Start Your Free Trial
            </p>
            <p className="text-xs text-white/80">
              7 days free • No credit card required
            </p>
          </div>
          <a
            href="/signup"
            className="bg-white text-[#1a1a2e] px-6 py-3 min-h-[48px] rounded-lg font-bold text-sm hover:bg-gray-50 transition shadow-lg whitespace-nowrap flex items-center justify-center"
          >
            Try Free
          </a>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-white/80 hover:text-white p-2 min-w-[48px] min-h-[48px] flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default StickyCTA;
