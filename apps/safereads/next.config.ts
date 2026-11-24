import type { NextConfig } from "next";

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
  // Old domain: getsafereads.com (bare) now lives at getsafefamily.com/reads.
  // basePath:false so this matches the real root, not /reads.
  redirects: async () => [
    { source: "/", has: [{ type: "host", value: "getsafereads.com" }], destination: "https://getsafefamily.com/reads", permanent: false, basePath: false },
    { source: "/", has: [{ type: "host", value: "www.getsafereads.com" }], destination: "https://getsafefamily.com/reads", permanent: false, basePath: false },
  ],
};

export default nextConfig;
