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
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Permissions-Policy",
          value: "camera=(self), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

export default nextConfig;
