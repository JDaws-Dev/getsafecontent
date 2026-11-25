/**
 * THE switch for retired apps (2026-11-25).
 *
 * SafeReads and SafeSpark are hidden everywhere on getsafefamily.com: no
 * dashboard tab, no kid-door tab, no links, and every /reads/* or /spark/*
 * path redirects to the home page (see next.config.ts). Their code, Convex
 * backends, data and blog posts are all kept.
 *
 * To bring one back: remove it from this list (and set RETIRED=false in that
 * app's own next.config.ts, which forwards its old domain), then rebuild and
 * deploy the hub. Retired blog posts come back by removing their slugs from
 * RETIRED_BLOG_SLUGS below.
 *
 * Plain data only: next.config.ts and the middleware import this file.
 */
export const RETIRED_APPS: readonly string[] = ["safereads", "safespark"];

const SLUG_BY_ID: Record<string, string> = {
  safetunes: "tunes",
  safetube: "tube",
  safereads: "reads",
  safestudy: "study",
  safespark: "spark",
};

/** URL slugs of the retired apps ("reads", "spark"). */
export const RETIRED_APP_SLUGS: readonly string[] = RETIRED_APPS.map((id) => SLUG_BY_ID[id] ?? id);

/** True for a retired app, by id ("safereads") or slug ("reads"). */
export function isRetiredApp(idOrSlug: string | null | undefined): boolean {
  if (!idOrSlug) return false;
  return RETIRED_APPS.includes(idOrSlug) || RETIRED_APP_SLUGS.includes(idOrSlug);
}

/**
 * Blog posts that are mainly about a retired app. Their URLs redirect to
 * /blog while the app is in RETIRED_APPS. The posts themselves are hidden with
 * `published: false` in their frontmatter (files stay in content/blog), so to
 * bring them back also set `published: true` in each file listed here.
 */
const BLOG_SLUGS_BY_APP: Record<string, string[]> = {
  safereads: [
    "bible-reading-app-for-kids-safereads",
    "books-with-inappropriate-content-for-kids",
    "how-to-know-if-book-appropriate-for-child",
    "scan-book-barcode-content-review",
    // Built around "music, videos and books" as one system:
    "homeschool-family-media-toolkit",
    "summer-media-plan-kids",
  ],
  safespark: [],
};

export const RETIRED_BLOG_SLUGS: readonly string[] = RETIRED_APPS.flatMap((id) => BLOG_SLUGS_BY_APP[id] ?? []);
