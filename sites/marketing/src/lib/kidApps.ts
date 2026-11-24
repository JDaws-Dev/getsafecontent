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
  tube: { name: "SafeTube" },
  reads: { name: "SafeReads" },
  study: { name: "SafeStudy" },
  spark: { name: "SafeSpark" },
};

export function kidAppSlug(app?: string[]): string | null {
  const s = app?.[0];
  return s && Object.prototype.hasOwnProperty.call(KID_APPS, s) ? s : null;
}
