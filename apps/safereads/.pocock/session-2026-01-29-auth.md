# Auth Migration Session - 2026-01-29

## Problem
Clerk authentication failing on production with 500 error and `clerk.browser.js` SyntaxError.

## Root Cause
Vercel wildcard DNS (ALIAS record) intercepts ALL subdomains including `clerk.getsafereads.com`, breaking Clerk's standard setup.

## Attempted Clerk Fixes (All Failed)

1. **Middleware rewrite to frontend-api.clerk.dev** - `NextResponse.rewrite()` doesn't properly proxy external domains on Vercel Edge
2. **API route proxy at /api/__clerk** - Next.js ignores directories starting with `__` during build
3. **API route proxy at /api/clerk-proxy** - Proxy worked but Clerk returned "Invalid host" - can't identify instance
4. **Various Host header combinations** - frontend-api.clerk.dev, clerk.getsafereads.com, frontend-api.clerk.services
5. **Clerk Dashboard proxy config** - Chicken-and-egg: Clerk validates proxy by calling it, but proxy returns error because Clerk doesn't recognize instance yet

## Solution: Migrated to Convex Auth

Ran Pocock loop to migrate from Clerk to Convex Auth.

### What Changed
- **Removed**: `@clerk/nextjs`, all Clerk components, `convex/auth.config.ts`, `/api/clerk-proxy`
- **Added**: `@convex-dev/auth`, `@auth/core@0.37.0`
- **convex/auth.ts**: Google OAuth provider
- **convex/schema.ts**: Added `authTables` spread
- **middleware.ts**: `convexAuthNextjsMiddleware` for route protection
- **layout.tsx**: `ConvexAuthNextjsServerProvider` replaces `ClerkProvider`
- **ConvexClientProvider.tsx**: `ConvexAuthProvider` replaces `ConvexProviderWithClerk`
- **Navbar.tsx**: Custom user menu with Radix dropdown, `useConvexAuth`, `useAuthActions`
- **convex/users.ts**: `getAuthUserId(ctx)` replaces clerkId lookups

### Convex Environment Variables Set
```
AUTH_GOOGLE_ID=<set in Convex dashboard>
AUTH_GOOGLE_SECRET=<set in Convex dashboard>
SITE_URL=https://getsafereads.com
```

### Google OAuth Callback URL
```
https://aware-falcon-501.convex.site/api/auth/callback/google
```
Must be set in Google Cloud Console → Credentials → OAuth Client → Authorized redirect URIs

## Current Status
- Build passes
- Lint passes
- Deployed to Vercel
- Google OAuth credentials configured in Convex
- **Next step**: Verify sign-in works after Google callback URL is confirmed

## Key Commits
- `2dea792` - feat(auth): migrate from Clerk to Convex Auth
- `aa310cd` - chore: initial Convex Auth setup (wip)
- `e87e18d` - wip: Clerk proxy attempts (abandoning for Convex Auth)

## Beads Issues
- `SafeReads-m4y` - Clerk fix (CLOSED - abandoned)
- `SafeReads-y1i` - Convex Auth migration (CLOSED - completed)
