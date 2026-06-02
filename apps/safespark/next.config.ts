import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  redirects: async () => [
    // Maker-route aliases — the canonical path is /make. /lumi was the
    // original codename, /demo was a guest-mode side door, /spark was
    // the earlier SafeSpark name. All keep working as bookmarks.
    { source: '/lumi', destination: '/make', permanent: false },
    { source: '/demo', destination: '/make', permanent: false },
    { source: '/spark', destination: '/make', permanent: false },
    // Old BELLA trainer paths — code stripped out of this repo (see the
    // archive/pre-trainer-strip git tag for a restore point). Anyone
    // following a stale bookmark lands on the homepage instead of a 404.
    { source: '/chat', destination: '/', permanent: false },
    { source: '/chat/:path*', destination: '/', permanent: false },
    // (formerly /learn and /learn/:path* — those redirected to / when
    // the old BELLA trainer was stripped. We now have a REAL /learn
    // training surface, so the redirects were swallowing it. Removed
    // 2026-05-29 — verified locally by `curl -L http://localhost:3010/learn/talking-to-spark`
    // hitting the lesson viewer instead of bouncing to /.)
    { source: '/literacy', destination: '/', permanent: false },
    { source: '/literacy/:path*', destination: '/', permanent: false },
    { source: '/journey', destination: '/', permanent: false },
    { source: '/studio', destination: '/', permanent: false },
    { source: '/apis', destination: '/', permanent: false },
    { source: '/build', destination: '/', permanent: false },
    { source: '/claim', destination: '/', permanent: false },
  ],
};

export default nextConfig;
