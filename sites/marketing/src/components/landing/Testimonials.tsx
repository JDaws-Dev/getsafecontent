"use client";

import { Music, Play, BookOpen, Search } from "lucide-react";

type App = "safetunes" | "safetube" | "safereads" | "safestudy";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  app: App;
  rating: number;
  avatar?: string; // Gradient classes like "from-pink-400 to-rose-500"
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Honestly I was bracing for a fight. Told my daughter no more new music until I could actually see the lyrics. Two weeks in she says I'm \u201Cactually the best\u201D because I finally let her have Sabrina Carpenter. Approving songs takes me maybe 90 seconds at night.",
    author: "Sara M.",
    role: "Mom of 4, Charlotte, NC",
    app: "safetunes",
    rating: 5,
    avatar: "from-pink-400 to-rose-500",
  },
  {
    quote:
      "My son kept finding weird gaming rabbit holes on YouTube. I tried everything — restricted mode, YouTube Kids, taking the tablet away entirely. SafeTube finally let me just say yes to the channels I trust and stop worrying about the rest.",
    author: "Mike R.",
    role: "Dad of 1, Columbus, OH",
    app: "safetube",
    rating: 5,
    avatar: "from-blue-400 to-indigo-500",
  },
  {
    quote:
      "I'm not usually someone who looks up content warnings on every book. But my 9-year-old came home with a YA novel that was clearly way above her reading level, and SafeReads showed me exactly which chapters had what. Mobile UI could be a little snappier, but honestly it's the first tool that gave me a real answer instead of a generic rating.",
    author: "Emily T.",
    role: "Mom of 2, Raleigh, NC",
    app: "safereads",
    rating: 5,
    avatar: "from-emerald-400 to-green-500",
  },
  {
    quote:
      "YouTube Kids was way too babyish for my 10-year-old but regular YouTube is a minefield. SafeTube is the in-between we needed.",
    author: "Jennifer K.",
    role: "Mom of 4, San Antonio, TX",
    app: "safetube",
    rating: 5,
    avatar: "from-rose-400 to-pink-500",
  },
  {
    quote:
      "I grew up on Taylor Swift. There's zero chance I'm telling my daughter she can't listen. But \u201CVigilante sh!t\u201D? Yeah, that one's a skip. The whole point of SafeTunes for me is that it's per song, not per album, so she still gets the music she actually wants.",
    author: "Amanda L.",
    role: "Mom of 1, Portland, OR",
    app: "safetunes",
    rating: 5,
    avatar: "from-violet-400 to-purple-500",
  },
  {
    quote:
      "We have a library card and a rule: mom checks SafeReads first. Takes about 20 seconds per book. The kids grab what's already on the list. Done.",
    author: "David P.",
    role: "Dad of 3, Tampa, FL",
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
  safestudy: {
    gradient: "from-blue-500 to-cyan-500",
    Icon: Search,
    label: "SafeStudy",
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
