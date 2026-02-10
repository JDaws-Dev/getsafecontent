"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

type Verdict = "safe" | "caution" | "warning" | "no_verdict";

const verdictLabels: Record<Verdict, string> = {
  safe: "Safe",
  caution: "Caution",
  warning: "Warning",
  no_verdict: "No Verdict",
};

const verdictEmoji: Record<Verdict, string> = {
  safe: "\u2705",
  caution: "\u26a0\ufe0f",
  warning: "\ud83d\udea8",
  no_verdict: "\u2753",
};

interface ShareVerdictButtonProps {
  bookTitle: string;
  verdict: Verdict;
  summary: string;
  ageRecommendation?: string;
  bookUrl: string;
}

function buildShareText({
  bookTitle,
  verdict,
  summary,
  ageRecommendation,
}: Omit<ShareVerdictButtonProps, "bookUrl">): string {
  const emoji = verdictEmoji[verdict];
  const label = verdictLabels[verdict];
  let text = `${emoji} SafeReads verdict for "${bookTitle}": ${label}`;
  if (ageRecommendation) {
    text += ` (Ages ${ageRecommendation})`;
  }
  text += `\n\n${summary}`;
  return text;
}

export function ShareVerdictButton({
  bookTitle,
  verdict,
  summary,
  ageRecommendation,
  bookUrl,
}: ShareVerdictButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText({
    bookTitle,
    verdict,
    summary,
    ageRecommendation,
  });

  async function handleShare() {
    // Use Web Share API if available (mobile browsers)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: `SafeReads: ${bookTitle}`,
          text: shareText,
          url: bookUrl,
        });
        return;
      } catch (err) {
        // User cancelled or share failed — fall through to clipboard
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    // Fallback: copy to clipboard
    const fullText = `${shareText}\n\n${bookUrl}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Last resort: prompt-based copy (very old browsers)
      prompt("Copy this verdict to share:", fullText);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 rounded-lg border border-parchment-300 bg-white px-3 py-1.5 text-xs font-medium text-ink-600 transition-colors hover:bg-parchment-50"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-verdict-safe" />
          Copied!
        </>
      ) : (
        <>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </>
      )}
    </button>
  );
}
