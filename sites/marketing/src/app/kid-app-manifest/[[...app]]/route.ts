/**
 * Per-page web-app manifest for the kid door (see play/[[...app]]/layout.tsx).
 * /kid-app-manifest        -> opens /play (all apps)
 * /kid-app-manifest/tunes  -> opens /play/tunes?solo=1 (SafeTunes on its own)
 */

import { KID_APPS, kidAppSlug } from "@/lib/kidApps";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ app?: string[] }> }
) {
  const { app } = await params;
  const slug = kidAppSlug(app);
  const entry = slug ? KID_APPS[slug] : null;
  const name = entry ? entry.name : "Safe Family";
  // The /play page points its manifest link at ?fc=<code> once it knows the
  // family code. iOS gives a home-screen app its own storage, empty on first
  // launch, so without this the kid typed the code a second time right after
  // a parent set it up in Safari. It rides as homefc= (a seed the door only
  // uses when the device remembers no code), not fc= (which always wins and
  // would undo a later "Not you?").
  const fc = (new URL(req.url).searchParams.get("fc") || "").toUpperCase();
  const seed = /^[A-Z0-9]{6}$/.test(fc) ? fc : null;
  const base = slug ? `/play/${slug}?solo=1` : "/play";
  const start = seed ? `${base}${base.includes("?") ? "&" : "?"}homefc=${seed}` : base;
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
      // A family's own manifest is never shared from a cache.
      "cache-control": seed ? "private, no-store" : "public, max-age=3600",
    },
  });
}
