'use client';

import { ReactNode } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { AuthProvider } from '@/contexts/AuthContext';

/**
 * Auth provider stack for SafeSpark.
 *
 * Wraps the React tree with two parallel auth systems:
 *
 * 1. Clerk (outer) — legacy `/sign-in` flow, the two existing accounts
 *    (jedaws + soonerjace) still authenticate this way. Convex queries
 *    that call `ctx.auth.getUserIdentity()` pick up the Clerk JWT here.
 *
 * 2. AuthProvider (inner) — Marketing Central federated JWT flow,
 *    used by the new `/login` page. Stores the JWT in localStorage,
 *    exposes `useAuth()` from `@/contexts/AuthContext`. Convex queries
 *    that need this identity take `email` as an explicit arg from
 *    components reading the AuthContext.
 *
 * The two contexts intentionally collide on the `useAuth` name —
 * we re-export Clerk's as-is and the new one comes from a different
 * module path. Components import from whichever they need:
 *   - `@clerk/nextjs` → legacy Clerk session
 *   - `@/contexts/AuthContext` → federated Marketing JWT
 *
 * Once Clerk is fully retired, the outer ClerkProvider gets ripped out
 * and queries get refactored to drop `ctx.auth.getUserIdentity()`.
 */

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        variables: {
          colorPrimary: '#a855f7',
          borderRadius: '14px',
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <AuthProvider>{children}</AuthProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
