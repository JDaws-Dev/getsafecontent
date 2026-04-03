"use client";

type BookSource = "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash" | "storyweaver";

interface SourceBadgeProps {
  source: BookSource | string;
  hasAudio?: boolean;
  compact?: boolean;
}

const SOURCE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; text: string; ring: string }
> = {
  gutenberg: {
    label: "Gutenberg",
    icon: "\uD83D\uDCD6", // open book
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
  bloom: {
    label: "Bloom",
    icon: "\uD83C\uDFA8", // art palette
    bg: "bg-pink-50",
    text: "text-pink-700",
    ring: "ring-pink-200",
  },
  lit2go: {
    label: "Lit2Go",
    icon: "\uD83D\uDCDA", // books
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  librivox: {
    label: "LibriVox",
    icon: "\uD83C\uDFA7", // headphones
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
  },
  bookdash: {
    label: "Book Dash",
    icon: "\uD83C\uDF0D", // globe
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  storyweaver: {
    label: "StoryWeaver",
    icon: "\uD83C\uDF1F", // star
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200",
  },
};

export function SourceBadge({ source, hasAudio, compact }: SourceBadgeProps) {
  const config = SOURCE_CONFIG[source] || SOURCE_CONFIG.gutenberg;

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 rounded-full ${config.bg} px-1.5 py-0.5 text-[9px] font-bold ${config.text} ring-1 ${config.ring}`}
        title={config.label}
      >
        <span className="text-[8px]">{config.icon}</span>
        {config.label}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full ${config.bg} px-2 py-1 text-[10px] font-bold ${config.text} ring-1 ${config.ring}`}
      >
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </span>
      {hasAudio && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-50 px-1.5 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200">
          <span className="text-xs">{"\uD83C\uDFA7"}</span>
          Audio
        </span>
      )}
    </div>
  );
}

/**
 * Inline audio indicator for book cards that have audio available.
 */
export function AudioIndicator() {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
      <span className="text-[8px]">{"\uD83C\uDFA7"}</span>
      Audio
    </span>
  );
}
