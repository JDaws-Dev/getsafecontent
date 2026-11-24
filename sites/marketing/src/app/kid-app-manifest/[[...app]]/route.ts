/**
 * Per-page web-app manifest for the kid door (see play/[[...app]]/layout.tsx).
 * /kid-app-manifest        -> opens /play (all apps)
 * /kid-app-manifest/tunes  -> opens /play/tunes?solo=1 (SafeTunes on its own)
 */

import { KID_APPS, kidAppSlug } from "@/lib/kidApps";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ app?: string[] }> }
) {
  const { app } = await params;
  const slug = kidAppSlug(app);
  const entry = slug ? KID_APPS[slug] : null;
  const name = entry ? entry.name : "Safe Family";
  const start = slug ? `/play/${slug}?solo=1` : "/play";
  const manifest = {
    id: slug ? `/play/${slug}` : "/play",
    name,
    short_name: name,
    start_url: start,
    scope: "/",
    display: "standalone",
    background_color: "#FBF6EF",
    theme_color: "#FBF6EF",
    icons: entry?.icon192 && entry.icon512
      ? [
          { src: entry.icon192, sizes: "192x192", type: "image/png" },
          { src: entry.icon512, sizes: "512x512", type: "image/png" },
          { src: entry.icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        ]
      : [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json",
      "cache-control": "public, max-age=3600",
    },
  });
}
