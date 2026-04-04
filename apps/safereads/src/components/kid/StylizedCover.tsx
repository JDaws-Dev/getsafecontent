"use client";

/**
 * StylizedCover - An elegant text-forward book cover for when no image is available.
 *
 * Inspired by Penguin Classics and Everyman's Library: muted colors, prominent
 * title in a serif font, small decorative emoji accent, subtle texture overlay.
 */

interface StylizedCoverProps {
  title: string;
  author: string;
  genre?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

// Genre -> muted palette mapping
// Each palette uses 2-3 sophisticated colors, no bright neon
const GENRE_PALETTES: Record<
  string,
  { bg: string; accent: string; emoji: string }
> = {
  adventure: {
    bg: "from-amber-900 to-amber-950",
    accent: "bg-amber-700/40",
    emoji: "\u2694\uFE0F",
  },
  fantasy: {
    bg: "from-indigo-900 to-indigo-950",
    accent: "bg-indigo-700/40",
    emoji: "\u2728",
  },
  science: {
    bg: "from-slate-700 to-slate-900",
    accent: "bg-cyan-800/40",
    emoji: "\uD83D\uDD2C",
  },
  "science fiction": {
    bg: "from-slate-800 to-indigo-950",
    accent: "bg-indigo-800/40",
    emoji: "\uD83D\uDE80",
  },
  nature: {
    bg: "from-emerald-900 to-emerald-950",
    accent: "bg-emerald-700/40",
    emoji: "\uD83C\uDF3F",
  },
  history: {
    bg: "from-stone-700 to-stone-900",
    accent: "bg-amber-800/40",
    emoji: "\uD83C\uDFF0",
  },
  "historical fiction": {
    bg: "from-stone-700 to-stone-900",
    accent: "bg-amber-800/40",
    emoji: "\uD83C\uDFF0",
  },
  mystery: {
    bg: "from-gray-800 to-gray-950",
    accent: "bg-gray-600/40",
    emoji: "\uD83D\uDD0D",
  },
  "mystery detective": {
    bg: "from-gray-800 to-gray-950",
    accent: "bg-gray-600/40",
    emoji: "\uD83D\uDD0D",
  },
  "fairy tales": {
    bg: "from-purple-900 to-purple-950",
    accent: "bg-rose-800/40",
    emoji: "\uD83E\uDDD9",
  },
  fables: {
    bg: "from-amber-800 to-stone-900",
    accent: "bg-amber-700/40",
    emoji: "\uD83E\uDD8A",
  },
  humor: {
    bg: "from-amber-800 to-amber-950",
    accent: "bg-orange-800/40",
    emoji: "\uD83D\uDE04",
  },
  "nursery rhymes": {
    bg: "from-sky-900 to-sky-950",
    accent: "bg-sky-700/40",
    emoji: "\uD83C\uDFB5",
  },
  "children's fiction": {
    bg: "from-teal-800 to-teal-950",
    accent: "bg-teal-700/40",
    emoji: "\uD83D\uDCDA",
  },
  "children's picture book": {
    bg: "from-rose-800 to-rose-950",
    accent: "bg-rose-700/40",
    emoji: "\uD83D\uDDBC\uFE0F",
  },
  "animal fiction": {
    bg: "from-emerald-800 to-emerald-950",
    accent: "bg-green-700/40",
    emoji: "\uD83D\uDC3E",
  },
  "coming-of-age fiction": {
    bg: "from-violet-800 to-violet-950",
    accent: "bg-violet-700/40",
    emoji: "\uD83C\uDF1F",
  },
  "classic literature": {
    bg: "from-stone-700 to-stone-900",
    accent: "bg-amber-900/40",
    emoji: "\uD83D\uDCD6",
  },
  "gothic romance": {
    bg: "from-rose-900 to-stone-950",
    accent: "bg-rose-800/40",
    emoji: "\uD83C\uDF39",
  },
  "gothic horror": {
    bg: "from-gray-800 to-gray-950",
    accent: "bg-gray-700/40",
    emoji: "\uD83E\uDDDB",
  },
  "gothic fiction": {
    bg: "from-gray-800 to-gray-950",
    accent: "bg-gray-700/40",
    emoji: "\uD83D\uDD6F\uFE0F",
  },
  "gothic science fiction": {
    bg: "from-teal-900 to-slate-950",
    accent: "bg-teal-800/40",
    emoji: "\u26A1",
  },
  romance: {
    bg: "from-rose-800 to-rose-950",
    accent: "bg-rose-700/40",
    emoji: "\uD83D\uDC95",
  },
  philosophy: {
    bg: "from-zinc-700 to-zinc-900",
    accent: "bg-zinc-600/40",
    emoji: "\uD83E\uDD14",
  },
  "psychological fiction": {
    bg: "from-violet-900 to-indigo-950",
    accent: "bg-violet-800/40",
    emoji: "\uD83E\uDDE0",
  },
  satire: {
    bg: "from-amber-800 to-red-950",
    accent: "bg-orange-800/40",
    emoji: "\uD83C\uDFAD",
  },
  "holiday classic": {
    bg: "from-red-900 to-green-950",
    accent: "bg-red-800/40",
    emoji: "\uD83C\uDF84",
  },
};

const DEFAULT_PALETTE = {
  bg: "from-slate-700 to-slate-900",
  accent: "bg-slate-600/40",
  emoji: "\uD83D\uDCD6",
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
  const palette = (effectiveGenre && GENRE_PALETTES[effectiveGenre.toLowerCase()]) || DEFAULT_PALETTE;

  const titleSizes = {
    sm: "text-[9px] leading-[12px]",
    md: "text-[11px] leading-[14px]",
    lg: "text-[13px] leading-[16px]",
  };

  const authorSizes = {
    sm: "text-[7px]",
    md: "text-[8px]",
    lg: "text-[9px]",
  };

  const emojiSizes = {
    sm: "text-[10px]",
    md: "text-[12px]",
    lg: "text-[14px]",
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      {/* Base gradient — dark, muted tones */}
      <div className={`absolute inset-0 bg-gradient-to-b ${palette.bg}`} />

      {/* Noise / grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Subtle vignette (darker edges) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.25)_100%)]" />

      {/* Book spine shadow (left edge) */}
      <div className="absolute bottom-0 left-0 top-0 w-[6px] bg-gradient-to-r from-black/30 to-transparent" />

      {/* Content — title-forward layout */}
      <div className="relative flex h-full flex-col items-center justify-between px-3 py-3 text-center">
        {/* Top decorative line */}
        <div className="flex w-full flex-col items-center gap-1 pt-1">
          <div className="h-px w-10 bg-white/20" />
          <div className={`${emojiSizes[size]} leading-none opacity-60`}>
            {palette.emoji}
          </div>
        </div>

        {/* Title — the hero element */}
        <div className="flex flex-1 flex-col items-center justify-center px-0.5">
          <p
            className={`${titleSizes[size]} line-clamp-4 font-semibold tracking-wide text-white/95`}
            style={{ fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif" }}
          >
            {title}
          </p>
        </div>

        {/* Bottom: author + decorative line */}
        <div className="flex w-full flex-col items-center gap-1 pb-0.5">
          <div className="h-px w-8 bg-white/20" />
          <p
            className={`${authorSizes[size]} line-clamp-1 font-medium tracking-wider text-white/50 uppercase`}
            style={{ fontFamily: "var(--font-serif), Georgia, 'Times New Roman', serif", letterSpacing: "0.08em" }}
          >
            {author}
          </p>
        </div>
      </div>

      {/* Inner border frame — very subtle */}
      <div className="absolute inset-[4px] rounded-lg border border-white/[0.07]" />
    </div>
  );
}

/**
 * Exported genre style lookup for use in other components.
 * Returns gradient info compatible with the old API shape.
 */
export function getGenreStyle(genre?: string, title?: string) {
  const effectiveGenre = genre || (title ? guessGenre(title) : null);
  const palette = (effectiveGenre && GENRE_PALETTES[effectiveGenre.toLowerCase()]) || DEFAULT_PALETTE;
  // Return the same shape other components expect
  return {
    gradient: palette.bg.replace("from-", "from-").replace("to-", "to-"),
    emoji: palette.emoji,
    pattern: "bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.06)_0%,transparent_50%)]",
  };
}
