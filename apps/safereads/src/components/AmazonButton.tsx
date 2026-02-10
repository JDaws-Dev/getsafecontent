"use client";

import { ExternalLink } from "lucide-react";

interface AmazonButtonProps {
  title: string;
  authors: string[];
  isbn?: string;
}

function buildAmazonSearchUrl(title: string, authors: string[], isbn?: string): string {
  // If ISBN is available, search by ISBN for an exact match
  const query = isbn ? isbn : `${title} ${authors[0] ?? ""}`;
  const params = new URLSearchParams({
    k: query,
    i: "stripbooks",
  });
  const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_AFFILIATE_TAG;
  if (affiliateTag) {
    params.set("tag", affiliateTag);
  }
  return `https://www.amazon.com/s?${params.toString()}`;
}

export function AmazonButton({ title, authors, isbn }: AmazonButtonProps) {
  const url = buildAmazonSearchUrl(title, authors, isbn);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-parchment-300 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-parchment-400 hover:bg-parchment-50"
    >
      Find on Amazon
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
