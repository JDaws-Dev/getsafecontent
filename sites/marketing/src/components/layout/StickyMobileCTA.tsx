"use client";

import { useState, useEffect } from "react";

export default function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling past hero (about 600px)
      const scrollY = window.scrollY;
      const heroHeight = 600;

      // Hide when pricing section is in view
      const pricingSection = document.getElementById("pricing");
      const pricingTop = pricingSection?.getBoundingClientRect().top || Infinity;

      setIsVisible(scrollY > heroHeight && pricingTop > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      {/* Gradient fade above the bar */}
      <div className="h-4 bg-gradient-to-t from-white dark:from-[#1a1a2e] to-transparent" />

      {/* CTA bar */}
      <div className="bg-white dark:bg-[#1a1a2e] border-t border-gray-200 dark:border-white/10 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-navy truncate">
              Safe Family — $14.99/mo
            </p>
            <p className="text-xs text-navy/60">
              All 5 apps • 7-day free trial
            </p>
          </div>
          <a
            href="#pricing"
            className="btn-peach whitespace-nowrap text-sm px-5 py-2.5 flex-shrink-0"
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </div>
  );
}
