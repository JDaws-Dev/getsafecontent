import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Edge middleware. Clerk was retired 2026-05-28 — this no longer wraps
 * clerkMiddleware. Auth is now handled entirely client-side via the
 * Marketing Central JWT (see `src/contexts/AuthContext.tsx`), and Convex
 * queries gate on identity via `ctx.auth.getUserIdentity()` /
 * `resolveSafeSparkIdentity` (kid sessionToken or marketing JWT).
 *
 * Kept as a thin passthrough so the Next.js middleware contract stays
 * intact (and so we have a place to drop redirects, rate limits, or
 * security headers later).
 *
 * Legacy `/sign-in` and `/sign-up` Clerk routes redirect to `/login`
 * to preserve old bookmarks and Clerk-issued email links.
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === '/sign-in' || pathname.startsWith('/sign-in/')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (pathname === '/sign-up' || pathname.startsWith('/sign-up/')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
