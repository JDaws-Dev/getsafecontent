"use client";

import { Music, Play, BookOpen } from "lucide-react";

type App = "safetunes" | "safetube" | "safereads";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  app: App;
  rating: number;
  avatar?: string; // Gradient classes like "from-pink-400 to-rose-500"
}

const testimonials: Testimonial[] = [
  // One strong testimonial per app
  {
    quote:
      "I approved 10 albums in 5 minutes. My daughter thinks I'm the coolest mom ever, and I actually sleep at night.",
    author: "Sara M.",
    role: "Mom of 2",
    app: "safetunes",
    rating: 5,
    avatar: "from-pink-400 to-rose-500",
  },
  {
    quote:
      "My son was going down weird YouTube rabbit holes. Now he has 30 approved channels and I can actually relax.",
    author: "Mike R.",
    role: "Dad of 2",
    app: "safetube",
    rating: 5,
    avatar: "from-blue-400 to-indigo-500",
  },
  {
    quote:
      "SafeReads caught themes in a book I never would have noticed. So grateful I checked before my son read it.",
    author: "Emily T.",
    role: "Mom of 2",
    app: "safereads",
    rating: 5,
    avatar: "from-emerald-400 to-green-500",
  },
  {
    quote:
      "YouTube Kids was too babyish for my 10-year-old. SafeTube is the perfect middle ground—real content I've vetted.",
    author: "Jennifer K.",
    role: "Mom of 3",
    app: "safetube",
    rating: 5,
    avatar: "from-rose-400 to-pink-500",
  },
  {
    quote:
      "Some albums have 2-3 inappropriate songs. I just approve the clean ones and skip the rest. She still gets her Taylor Swift.",
    author: "Amanda L.",
    role: "Mom of 1",
    app: "safetunes",
    rating: 5,
    avatar: "from-violet-400 to-purple-500",
  },
  {
    quote:
      "I used to be nervous about every book my daughter picked up. Now I check SafeReads first and can say yes with confidence.",
    author: "David P.",
    role: "Dad of 3",
    app: "safereads",
    rating: 5,
    avatar: "from-sky-400 to-blue-500",
  },
];

const appConfig: Record<
  App,
  { gradient: string; Icon: typeof Music; label: string }
> = {
  safetunes: {
    gradient: "from-indigo-500 to-purple-500",
    Icon: Music,
    label: "SafeTunes",
  },
  safetube: {
    gradient: "from-red-500 to-orange-500",
    Icon: Play,
    label: "SafeTube",
  },
  safereads: {
    gradient: "from-emerald-500 to-teal-500",
    Icon: BookOpen,
    label: "SafeReads",
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          className={`w-5 h-5 ${i < rating ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const config = appConfig[testimonial.app];
  const Icon = config.Icon;
  const initials = testimonial.author
    .split(" ")
    .map((n) => n[0])
    .join("");

  return (
    <div className="w-[280px] sm:w-[320px] lg:w-auto bg-white rounded-2xl p-5 sm:p-6 shadow-lg flex flex-col h-full">
      {/* Star rating at top */}
      <div className="mb-3 sm:mb-4">
        <StarRating rating={testimonial.rating} />
      </div>

      {/* Quote text */}
      <p className="text-slate-700 text-sm leading-relaxed flex-1">
        &ldquo;{testimonial.quote}&rdquo;
      </p>

      {/* Divider line */}
      <div className="border-t border-slate-100 my-3 sm:my-4" />

      {/* Author section - stacks on mobile */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar with gradient background + initials */}
          <div
            className={`h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-gradient-to-br ${testimonial.avatar || "from-slate-300 to-slate-400"} flex items-center justify-center flex-shrink-0`}
          >
            <span className="text-xs sm:text-sm font-semibold text-white">
              {initials}
            </span>
          </div>

          {/* Name and role */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {testimonial.author}
            </p>
            <p className="text-xs text-slate-500">{testimonial.role}</p>
          </div>
        </div>

        {/* App badge - separate row for clarity */}
        <div
          className={`inline-flex items-center gap-1.5 bg-gradient-to-r ${config.gradient} text-white text-xs px-2.5 py-1 rounded-full self-start`}
        >
          <Icon className="w-3 h-3" />
          <span className="font-medium">{config.label}</span>
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  return (
    <section className="py-12 sm:py-16 bg-slate-50 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            What parents are saying
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Real feedback from families who value screen time control.
          </p>
        </div>

        {/* Desktop: Grid layout showing all testimonials */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} />
          ))}
        </div>
      </div>

      {/* Mobile/Tablet: Horizontal scrolling testimonials */}
      <div
        className="lg:hidden flex gap-4 sm:gap-6 overflow-x-auto pb-4 px-4 sm:px-6 snap-x snap-mandatory"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {testimonials.map((testimonial, index) => (
          <div key={index} className="snap-center flex-shrink-0">
            <TestimonialCard testimonial={testimonial} />
          </div>
        ))}

        {/* Add some right padding */}
        <div className="flex-shrink-0 w-4 sm:w-6" />
      </div>

      {/* Hide scrollbar with CSS (mobile only) */}
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Scroll hint for mobile */}
      <div className="mt-4 text-center lg:hidden">
        <p className="text-sm text-slate-400 flex items-center justify-center gap-1">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          Swipe to see more
        </p>
      </div>
    </section>
  );
}
