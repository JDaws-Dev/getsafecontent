/**
 * The ONE list of sites a locked-down kid device needs for Safe Family.
 * Every setup page on the hub reads it from here (setup guide, lock-down
 * guide, "Check a kid's device"). The apps link to the hub guide rather than
 * keeping their own copies.
 *
 * Device controls (Family Link, Screen Time, Microsoft Family) filter the
 * pages and frames a browser opens, so two sites are enough:
 *   - getsafefamily.com: every app, kids and parents, is served from here.
 *   - youtube-nocookie.com: the player SafeTube embeds. It plays one approved
 *     video and has no search, no home page and no browsing.
 * Never youtube.com / m.youtube.com: one approval unlocks all of YouTube
 * (a real family's child had full YouTube for weeks that way, Oct 2026).
 *
 * Network filters (Circle, Bark Home, router or DNS filters) block every
 * connection by domain, including the background services a page talks to,
 * so they also need BACKGROUND_SERVICES. None of these is a site a child can
 * browse. Derived from the code (VITE_CONVEX_URL / NEXT_PUBLIC_CONVEX_URL,
 * SafeTube's player, MusicKit's script and artwork hosts); not yet tested on
 * each filter product.
 */

export const LOCK_DOWN_GUIDE_PATH = "/guides/lock-down";
export const LOCK_DOWN_GUIDE_URL = `https://getsafefamily.com${LOCK_DOWN_GUIDE_PATH}`;

export const ALLOW_SITES: { site: string; why: string }[] = [
  { site: "getsafefamily.com", why: "Safe Family (every app)" },
  { site: "youtube-nocookie.com", why: "SafeTube's video player only (no search, no browsing)" },
];

export const BLOCK_SITES = ["youtube.com", "m.youtube.com"];

export const BACKGROUND_SERVICES: { site: string; why: string }[] = [
  { site: "convex.cloud", why: "Safe Family's data service (every app)" },
  { site: "convex.site", why: "Safe Family's data service (every app)" },
  { site: "googlevideo.com", why: "SafeTube: the video itself" },
  { site: "ytimg.com", why: "SafeTube: video pictures" },
  { site: "js-cdn.music.apple.com", why: "SafeTunes: Apple's music player" },
  { site: "api.music.apple.com", why: "SafeTunes: song and album details" },
  { site: "itunes.apple.com", why: "SafeTunes: song playback" },
  { site: "mzstatic.com", why: "SafeTunes: album covers" },
];

/** "getsafefamily.com and youtube-nocookie.com" — for sentences. */
export const ALLOW_SITES_TEXT = ALLOW_SITES.map((s) => s.site).join(" and ");
