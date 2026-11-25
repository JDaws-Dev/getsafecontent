import { isRetiredApp } from "./retiredApps";

/** Kid-door app names and home-screen icons, shared by the /play layout and
 *  the per-app web-app manifest. Apps without their own icon use the Safe
 *  Family umbrella. */
export const KID_APPS: Record<string, { name: string; icon192?: string; icon512?: string; apple?: string }> = {
  tunes: {
    name: "SafeTunes",
    icon192: "/kid-icons/tunes-full-192.png",
    icon512: "/kid-icons/tunes-full-512.png",
    apple: "/kid-icons/tunes-apple-180.png",
  },
  tube: {
    name: "SafeTube",
    icon192: "/kid-icons/tube-full-192.png",
    icon512: "/kid-icons/tube-full-512.png",
    apple: "/kid-icons/tube-apple-180.png",
  },
  reads: { name: "SafeReads" },
  study: {
    name: "SafeStudy",
    icon192: "/kid-icons/study-full-192.png",
    icon512: "/kid-icons/study-full-512.png",
    apple: "/kid-icons/study-apple-180.png",
  },
  spark: { name: "SafeSpark" },
};

// Retired apps (src/lib/retiredApps.ts) count as unknown: their kid-door
// manifest and page titles fall back to plain Safe Family.
export function kidAppSlug(app?: string[]): string | null {
  const s = app?.[0];
  return s && Object.prototype.hasOwnProperty.call(KID_APPS, s) && !isRetiredApp(s) ? s : null;
}
