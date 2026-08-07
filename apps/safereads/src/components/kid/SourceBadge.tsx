"use client";

import { Headphones } from "lucide-react";

type BookSource = "gutenberg" | "bloom" | "lit2go" | "librivox" | "bookdash" | "storyweaver";

interface SourceBadgeProps {
  source: BookSource | string;
  hasAudio?: boolean;
  compact?: boolean;
}

/**
 * Simplified badge -- no longer shows source names (kids don't care).
 * Only renders an audio indicator when the book has audio.
 * Kept for backward compatibility with FreeBookSearch.
 */
export function SourceBadge({ source, hasAudio, compact }: SourceBadgeProps) {
  // Audio sources always show the audio badge
  const isAudioSource = source === "librivox" || source === "lit2go";
  const showAudio = hasAudio || isAudioSource;

  if (!showAudio) return null;

  return <AudioIndicator />;
}

/**
 * Inline audio indicator for book cards that have audio available.
 */
export function AudioIndicator() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-1.5 py-0.5 text-[9px] font-bold text-accent-700">
      <Headphones className="h-2.5 w-2.5" />
      Audio
    </span>
  );
}
