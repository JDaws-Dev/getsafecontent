import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  // Federated-auth routes (Marketing Central JWT path) — public because
  // auth happens client-side via AuthContext. Parallel to Clerk's
  // /sign-in during the migration window.
  '/login',
  '/forgot-password',
  '/reset-password',
  // Parent dashboard + setup are now dual-auth (Clerk OR Marketing JWT).
  // The page itself checks for either session and renders a "please sign
  // in" fallback if neither is present, so Clerk middleware shouldn't
  // intercept and force-redirect to /sign-in (which would lock out
  // federated users entirely).
  '/parent',
  '/parent/(.*)',
  '/start',         // family-code entry — no Clerk identity needed
  '/make(.*)',      // SafeSpark maker
  '/s/(.*)',        // public project shares
  '/blog(.*)',      // public blog content
  '/privacy',       // privacy policy
  '/terms',         // terms of service
  '/sitemap.xml',   // SEO sitemap
  '/robots.txt',    // SEO robots
  '/opengraph-image', // social preview image
  '/lumi(.*)',      // legacy alias for /make — old shared links
  '/demo(.*)',      // legacy supervised maker pad alias
  '/spark(.*)',     // legacy SafeSpark-era alias
  '/api/demo(.*)',  // demo maker API is gated by Clerk JWT / kid session
  '/api/extract-pdf(.*)', // PDF extract endpoint — same auth model
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    // Redirect signed-out users to our own /sign-in page (which embeds
    // Clerk's <SignIn> component) so the URL bar stays on
    // getsafespark.com instead of bouncing to the Clerk hosted domain.
    await auth.protect({ unauthenticatedUrl: new URL('/sign-in', req.url).toString() });
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
