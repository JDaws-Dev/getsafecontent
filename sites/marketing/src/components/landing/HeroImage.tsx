"use client";

import Image from "next/image";
import { useState } from "react";

export default function HeroImage() {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="relative">
      {/* Image with sharp top-left, rounded other corners */}
      <div
        className="relative overflow-hidden shadow-2xl"
        style={{
          borderTopLeftRadius: '0px',
          borderTopRightRadius: '24px',
          borderBottomLeftRadius: '24px',
          borderBottomRightRadius: '24px',
        }}
      >
        {/* Image container with fallback */}
        <div className="aspect-[4/3] bg-gradient-to-br from-amber-100 to-orange-50 relative">
          {!imageError && (
            <Image
              src="/images/hero-family.jpg"
              alt="Father and daughter enjoying tablet together"
              fill
              className="object-cover"
              priority
              onError={() => setImageError(true)}
            />
          )}

          {/* Placeholder shown when no image */}
          {imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-navy/40">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <p className="text-sm">Family photo placeholder</p>
              </div>
            </div>
          )}
        </div>

        {/* Trust badge overlay on bottom-right of photo */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-4 py-2 shadow-lg flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-navy">Parent Verified</p>
              <p className="text-[10px] text-navy/60">Safe Content Certified</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
