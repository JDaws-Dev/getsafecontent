import type { Metadata, Viewport } from "next";
import { KID_APPS, kidAppSlug } from "@/lib/kidApps";

/**
 * Home-screen support for the kid door.
 *
 * The site-wide manifest says start_url "/", and iOS Safari uses a page's
 * manifest start_url when a parent taps Share > Add to Home Screen, without
 * letting them edit it. So a "SafeTunes" icon added from /play/tunes opened
 * the marketing home page. Each /play page points at its own manifest whose
 * start_url is that page (in solo mode: just that app, no tab bar).
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ app?: string[] }>;
}): Promise<Metadata> {
  const { app } = await params;
  const slug = kidAppSlug(app);
  const entry = slug ? KID_APPS[slug] : null;
  const name = entry ? entry.name : "Safe Family";
  return {
    title: slug ? `${name} for kids` : "Safe Family for kids",
    description: slug
      ? `Kids: open ${name} with your family code. Only what your parent approved.`
      : "Kids: enter your family code to open your Safe Family apps. Only what your parent approved.",
    manifest: slug ? `/kid-app-manifest/${slug}` : "/kid-app-manifest",
    appleWebApp: { capable: true, title: name, statusBarStyle: "default" },
    ...(entry?.apple ? {
          icons: {
            icon: [
              { url: "/favicon.ico" },
              { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
            ],
            apple: [{ url: entry.apple, sizes: "180x180" }],
          },
        } : {}),
  };
}

// Edge to edge on an iPhone home-screen app so the door can pad its own safe
// areas (page.tsx); without cover, iOS leaves the app's bottom controls under
// the home bar. themeColor matches the door's white header.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
