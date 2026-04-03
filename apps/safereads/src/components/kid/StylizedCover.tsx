"use client";

/**
 * StylizedCover - A beautiful CSS-only book cover for when no image is available.
 *
 * Uses genre-based gradients, decorative emojis, and text overlays to create
 * an attractive fallback that feels intentional rather than broken.
 */

interface StylizedCoverProps {
  title: string;
  author: string;
  genre?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

// Genre -> gradient + emoji mapping
const GENRE_STYLES: Record<
  string,
  { gradient: string; emoji: string; pattern: string }
> = {
  adventure: {
    gradient: "from-orange-400 via-amber-500 to-yellow-600",
    emoji: "\u2694\uFE0F",
    pattern: "bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12)_0%,transparent_50%)]",
  },
  fantasy: {
    gradient: "from-purple-500 via-indigo-500 to-violet-600",
    emoji: "\u2728",
    pattern: "bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  science: {
    gradient: "from-blue-400 via-cyan-500 to-teal-500",
    emoji: "\uD83D\uDD2C",
    pattern: "bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.12)_0%,transparent_50%)]",
  },
  "science fiction": {
    gradient: "from-blue-500 via-indigo-600 to-violet-700",
    emoji: "\uD83D\uDE80",
    pattern: "bg-[radial-gradient(circle_at_60%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  nature: {
    gradient: "from-green-400 via-emerald-500 to-teal-600",
    emoji: "\uD83C\uDF3F",
    pattern: "bg-[radial-gradient(circle_at_40%_70%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  history: {
    gradient: "from-amber-600 via-yellow-700 to-orange-800",
    emoji: "\uD83C\uDFF0",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  "historical fiction": {
    gradient: "from-amber-600 via-yellow-700 to-orange-800",
    emoji: "\uD83C\uDFF0",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  mystery: {
    gradient: "from-slate-500 via-gray-600 to-slate-700",
    emoji: "\uD83D\uDD0D",
    pattern: "bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  "mystery detective": {
    gradient: "from-slate-500 via-gray-600 to-slate-700",
    emoji: "\uD83D\uDD0D",
    pattern: "bg-[radial-gradient(circle_at_20%_80%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  "fairy tales": {
    gradient: "from-pink-400 via-rose-400 to-fuchsia-500",
    emoji: "\uD83E\uDDD9",
    pattern: "bg-[radial-gradient(circle_at_60%_40%,rgba(255,255,255,0.12)_0%,transparent_50%)]",
  },
  fables: {
    gradient: "from-pink-400 via-rose-400 to-fuchsia-500",
    emoji: "\uD83E\uDD8A",
    pattern: "bg-[radial-gradient(circle_at_60%_40%,rgba(255,255,255,0.12)_0%,transparent_50%)]",
  },
  humor: {
    gradient: "from-yellow-400 via-orange-400 to-amber-500",
    emoji: "\uD83D\uDE04",
    pattern: "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.15)_0%,transparent_50%)]",
  },
  "nursery rhymes": {
    gradient: "from-sky-300 via-blue-400 to-indigo-400",
    emoji: "\uD83C\uDFB5",
    pattern: "bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15)_0%,transparent_50%)]",
  },
  "children's fiction": {
    gradient: "from-emerald-400 via-teal-500 to-cyan-500",
    emoji: "\uD83D\uDCDA",
    pattern: "bg-[radial-gradient(circle_at_40%_60%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  "children's picture book": {
    gradient: "from-pink-300 via-rose-400 to-orange-400",
    emoji: "\uD83D\uDDBC\uFE0F",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.12)_0%,transparent_50%)]",
  },
  "animal fiction": {
    gradient: "from-green-400 via-lime-500 to-emerald-500",
    emoji: "\uD83D\uDC3E",
    pattern: "bg-[radial-gradient(circle_at_60%_70%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  "coming-of-age fiction": {
    gradient: "from-violet-400 via-purple-500 to-fuchsia-500",
    emoji: "\uD83C\uDF1F",
    pattern: "bg-[radial-gradient(circle_at_40%_40%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  "classic literature": {
    gradient: "from-stone-500 via-amber-700 to-yellow-900",
    emoji: "\uD83D\uDCD6",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  "gothic romance": {
    gradient: "from-rose-700 via-red-800 to-stone-800",
    emoji: "\uD83C\uDF39",
    pattern: "bg-[radial-gradient(circle_at_30%_70%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  "gothic horror": {
    gradient: "from-gray-700 via-slate-800 to-gray-900",
    emoji: "\uD83E\uDDDB",
    pattern: "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  "gothic fiction": {
    gradient: "from-gray-600 via-slate-700 to-gray-800",
    emoji: "\uD83D\uDD6F\uFE0F",
    pattern: "bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  "gothic science fiction": {
    gradient: "from-teal-700 via-cyan-800 to-slate-800",
    emoji: "\u26A1",
    pattern: "bg-[radial-gradient(circle_at_40%_30%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  romance: {
    gradient: "from-rose-400 via-pink-500 to-fuchsia-500",
    emoji: "\uD83D\uDC95",
    pattern: "bg-[radial-gradient(circle_at_60%_40%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
  philosophy: {
    gradient: "from-stone-500 via-zinc-600 to-slate-700",
    emoji: "\uD83E\uDD14",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  "psychological fiction": {
    gradient: "from-violet-600 via-purple-700 to-indigo-800",
    emoji: "\uD83E\uDDE0",
    pattern: "bg-[radial-gradient(circle_at_40%_60%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  },
  satire: {
    gradient: "from-amber-500 via-orange-600 to-red-600",
    emoji: "\uD83C\uDFAD",
    pattern: "bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
  },
  "holiday classic": {
    gradient: "from-red-500 via-green-600 to-red-700",
    emoji: "\uD83C\uDF84",
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_50%)]",
  },
};

const DEFAULT_STYLE = {
  gradient: "from-purple-500 via-indigo-500 to-blue-600",
  emoji: "\uD83D\uDCD6",
  pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08)_0%,transparent_50%)]",
};

/**
 * Try to guess a genre from the title for better fallback styling.
 */
function guessGenre(title: string): string | null {
  const lower = title.toLowerCase();
  if (lower.includes("fairy") || lower.includes("tale")) return "fairy tales";
  if (lower.includes("fable")) return "fables";
  if (lower.includes("adventure")) return "adventure";
  if (lower.includes("mystery") || lower.includes("sherlock") || lower.includes("detective")) return "mystery";
  if (lower.includes("nursery") || lower.includes("rhyme")) return "nursery rhymes";
  if (lower.includes("christmas") || lower.includes("carol")) return "holiday classic";
  if (lower.includes("wizard") || lower.includes("magic") || lower.includes("wonderland")) return "fantasy";
  if (lower.includes("science") || lower.includes("time machine")) return "science fiction";
  if (lower.includes("treasure") || lower.includes("island")) return "adventure";
  if (lower.includes("rabbit") || lower.includes("bunny") || lower.includes("duck") || lower.includes("animal")) return "animal fiction";
  return null;
}

export function StylizedCover({
  title,
  author,
  genre,
  size = "md",
}: StylizedCoverProps) {
  const effectiveGenre = genre || guessGenre(title);
  const style = (effectiveGenre && GENRE_STYLES[effectiveGenre.toLowerCase()]) || DEFAULT_STYLE;

  const sizeClasses = {
    sm: "w-24 h-36",
    md: "w-28 h-40",
    lg: "w-32 h-48",
  };

  const emojiSizes = {
    sm: "text-2xl",
    md: "text-3xl",
    lg: "text-4xl",
  };

  const titleSizes = {
    sm: "text-[8px] leading-[10px]",
    md: "text-[9px] leading-[11px]",
    lg: "text-[10px] leading-[13px]",
  };

  const authorSizes = {
    sm: "text-[7px]",
    md: "text-[7px]",
    lg: "text-[8px]",
  };

  return (
    <div
      className={`${sizeClasses[size]} relative overflow-hidden rounded-xl`}
    >
      {/* Main gradient background */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.gradient}`}
      />

      {/* Subtle pattern overlay */}
      <div className={`absolute inset-0 ${style.pattern}`} />

      {/* Texture overlay for book-like feel */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_40%,transparent_60%,rgba(0,0,0,0.1)_100%)]" />

      {/* Book spine shadow (left edge) */}
      <div className="absolute bottom-0 left-0 top-0 w-[6px] bg-gradient-to-r from-black/25 to-transparent" />

      {/* Content */}
      <div className="relative flex h-full flex-col items-center justify-center px-2.5 py-3 text-center">
        {/* Genre emoji */}
        <div className={`${emojiSizes[size]} mb-1.5 drop-shadow-md`}>
          {style.emoji}
        </div>

        {/* Title */}
        <p
          className={`${titleSizes[size]} line-clamp-3 font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]`}
        >
          {title}
        </p>

        {/* Divider */}
        <div className="my-1 h-px w-8 bg-white/30" />

        {/* Author */}
        <p
          className={`${authorSizes[size]} line-clamp-1 font-medium text-white/70`}
        >
          {author}
        </p>
      </div>

      {/* Subtle border frame */}
      <div className="absolute inset-[3px] rounded-lg border border-white/10" />
    </div>
  );
}

/**
 * Exported genre style lookup for use in other components.
 */
export function getGenreStyle(genre?: string, title?: string) {
  const effectiveGenre = genre || (title ? guessGenre(title) : null);
  return (effectiveGenre && GENRE_STYLES[effectiveGenre.toLowerCase()]) || DEFAULT_STYLE;
}
