import type { NextConfig } from "next";

// RETIRED (2026-11-25): SafeReads is hidden from everyone. While true, every
// page on this app (any host, including getsafereads.com and the hub path
// /reads/*) redirects to the getsafefamily.com home page; only /api routes
// (webhooks) still answer. Code, Convex backend and data are untouched. To
// bring SafeReads back: set this to false AND remove "safereads" from
// RETIRED_APPS in sites/marketing/src/lib/retiredApps.ts, then deploy both.
const RETIRED = true;

const nextConfig: NextConfig = {
  // One-site: served at getsafefamily.com/reads behind the hub proxy (prefix intact).
  basePath: "/reads",
  // The hub rewrites bare /reads to /reads/ (trailing slash). Without this Next
  // 308s /reads/ back to /reads and the two redirect each other forever.
  skipTrailingSlashRedirect: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
      },
      {
        protocol: "https",
        hostname: "www.gutenberg.org",
      },
      {
        protocol: "https",
        hostname: "storyweaver.org.in",
      },
      {
        protocol: "https",
        hostname: "*.convex.cloud",
      },
    ],
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // SAMEORIGIN, not DENY: the hub renders /reads/dashboard inside its own
        // dashboard in a same-origin iframe. Cross-site framing stays blocked.
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(), geolocation=()",
        },
      ],
    },
  ],
  // Old domain: getsafereads.com now lives at getsafefamily.com. Every path on
  // that host EXCEPT the app's own /reads/* goes to the right hub page.
  // - Host-only: these rules never fire for getsafefamily.com traffic.
  // - Never /reads/*: the hub proxies getsafefamily.com/reads/* here (possibly
  //   via this host), so matching it would loop.
  // - basePath:false so sources match the real root, not /reads/...
  // Order matters: the first match wins.
  redirects: async () => {
    if (RETIRED) {
      return [
        { source: "/", destination: "https://getsafefamily.com/" },
        {
          source: "/:path((?!api(?:/|$)|reads/api(?:/|$)).+)",
          destination: "https://getsafefamily.com/",
        },
      ].map((r) => ({ ...r, permanent: false, basePath: false as const }));
    }
    const hosts = ["getsafereads.com", "www.getsafereads.com"];
    const rules: { source: string; destination: string }[] = [
      // Kid reading pages -> the kid door.
      { source: "/read/:path*", destination: "https://getsafefamily.com/play/reads" },
      { source: "/play/:path*", destination: "https://getsafefamily.com/play/reads" },
      // Parent pages -> the parent dashboard's SafeReads tab.
      { source: "/dashboard/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/parent/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/admin/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/settings/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/onboarding/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/login/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/signup/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/forgot-password/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      { source: "/reset-password/:path*", destination: "https://getsafefamily.com/dashboard/reads" },
      // Bare / and anything else that is not /reads/* (or /api, which should
      // 404 honestly rather than bounce a webhook to a web page) -> landing.
      { source: "/", destination: "https://getsafefamily.com/reads" },
      { source: "/:path((?!reads(?:/|$)|api(?:/|$)).*)", destination: "https://getsafefamily.com/reads" },
    ];
    return hosts.flatMap((host) =>
      rules.map((r) => ({
        ...r,
        has: [{ type: "host" as const, value: host }],
        permanent: false,
        basePath: false as const,
      }))
    );
  },
};

export default nextConfig;
