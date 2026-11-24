import type { Metadata } from "next";

/**
 * Home-screen support for the kid door.
 *
 * The site-wide manifest says start_url "/", and iOS Safari uses a page's
 * manifest start_url when a parent taps Share > Add to Home Screen, without
 * letting them edit it. So a "SafeTunes" icon added from /play/tunes opened
 * the marketing home page. Each /play page points at its own manifest whose
 * start_url is that page (in solo mode: just that app, no tab bar).
 */

const NAMES: Record<string, string> = {
  tunes: "SafeTunes",
  tube: "SafeTube",
  reads: "SafeReads",
  study: "SafeStudy",
  spark: "SafeSpark",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ app?: string[] }>;
}): Promise<Metadata> {
  const { app } = await params;
  const slug = app?.[0] && NAMES[app[0]] ? app[0] : null;
  const name = slug ? NAMES[slug] : "Safe Family";
  return {
    title: slug ? `${name} for kids` : "Safe Family for kids",
    manifest: slug ? `/kid-app-manifest/${slug}` : "/kid-app-manifest",
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
  };
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
