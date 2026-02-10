"use client";

import { useState, useEffect } from "react";
import { Music, PlaySquare, Book, Shield } from "lucide-react";

const rotatingWords = ["watching", "listening to", "reading"];

export default function Hero() {
  const [wordIndex, setWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setWordIndex((prev) => (prev + 1) % rotatingWords.length);
        setIsAnimating(false);
      }, 200);
    }, 3000);

    return () => clearInterval(interval);
  }, []);
  return (
    <section className="relative overflow-hidden bg-cream pt-24 pb-12 sm:pt-28 sm:pb-14 lg:pt-32 lg:pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left side - Text content */}
          <div className="flex-1 text-center lg:text-left max-w-xl lg:max-w-none">
            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy mb-6 leading-tight">
              Stop worrying about what they&apos;re{" "}
              <span className="inline-block relative">
                {/* Invisible text to reserve space for longest word */}
                <span className="invisible" aria-hidden="true">listening to.</span>
                {/* Visible rotating text positioned on top */}
                <span
                  className={`absolute left-0 top-0 text-transparent bg-clip-text bg-gradient-to-r from-peach-start to-peach-end transition-all duration-200 ${
                    isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
                  }`}
                >
                  {rotatingWords[wordIndex]}.
                </span>
              </span>
            </h1>

            {/* Platform badges */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
              <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
                </svg>
                Apple Music
              </span>
              <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
                <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                YouTube
              </span>
              <span className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full font-medium text-gray-700 shadow-sm">
                <Book className="w-5 h-5 text-emerald-600" />
                Any Book
              </span>
            </div>

            {/* Subheadline */}
            <p className="text-xl text-navy/70 mb-8 max-w-lg mx-auto lg:mx-0">
              Your kids use real YouTube, real Apple Music, real books—but only the content you&apos;ve approved. Nothing slips through.
            </p>

            {/* Price + CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
              <a
                href="#pricing"
                className="btn-peach inline-flex items-center justify-center text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all"
              >
                Get All 3 Apps — $9.99/mo
              </a>
              <div className="text-sm text-navy/60">
                <span className="line-through text-navy/40">$14.97</span>
                <span className="ml-2 text-emerald-600 font-medium">Save 33%</span>
              </div>
            </div>

            {/* Trust line */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-navy/50 mb-4">
              <span className="flex items-center gap-1.5">
                <Shield className="w-4 h-4" />
                7-day free trial
              </span>
              <span className="hidden sm:inline">•</span>
              <span>No credit card required</span>
              <span className="hidden sm:inline">•</span>
              <span>Cancel anytime</span>
            </div>

          </div>

          {/* Right side - Photo */}
          <div className="flex-1 relative w-full flex items-center justify-center lg:justify-end">
            <div className="relative max-w-md lg:max-w-lg w-full">
              <div
                className="relative aspect-[4/5] overflow-hidden shadow-2xl"
                style={{ borderRadius: '0 3rem 3rem 3rem' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.pexels.com/photos/4908731/pexels-photo-4908731.jpeg?auto=compress&cs=tinysrgb&w=600&h=750&fit=crop"
                  alt="Kids safely using tablet together"
                  className="w-full h-full object-cover"
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
