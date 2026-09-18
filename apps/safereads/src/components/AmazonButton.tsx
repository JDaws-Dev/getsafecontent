"use client";

import { ExternalLink } from "lucide-react";

interface AmazonButtonProps {
  title: string;
  authors: string[];
  isbn?: string;
}

/**
 * Amazon search link with the affiliate tag attached. Shared by the parent
 * "Find on Amazon" button and the kid page's "Find on Kindle" link, so both
 * carry the tag (the kid link used to be a bare, untagged URL).
 */
export function buildAmazonSearchUrl(
  title: string,
  authors: string[],
  isbn?: string,
  department: "stripbooks" | "digital-text" = "stripbooks",
): string {
  // If ISBN is available, search by ISBN for an exact match
  const query = isbn ? isbn : `${title} ${authors[0] ?? ""}`;
  const params = new URLSearchParams({
    k: query,
    i: department,
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
      className="inline-flex items-center gap-2 rounded-lg border border-brand-cream-2 bg-white px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-brand-cream-2 hover:bg-brand-cream-2"
    >
      Find on Amazon
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
