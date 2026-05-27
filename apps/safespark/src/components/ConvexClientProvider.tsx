'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { ClerkProvider, useAuth as useClerkAuth } from '@clerk/nextjs';
import { AuthProvider, useAuth as useMarketingAuth } from '@/contexts/AuthContext';

/**
 * Dual-provider auth stack for SafeSpark.
 *
 * Two parallel identity systems run side by side during the Clerk →
 * Marketing Central migration:
 *
 * - **Clerk** (legacy `/sign-in`): jedaws + soonerjace + any session
 *   that authenticated before tonight. `useClerkAuth().isSignedIn` is
 *   the source of truth.
 * - **Marketing JWT** (federated `/login`): all 23 backfilled lifetime
 *   users + any new unified-pricing customer. `useMarketingAuth().token`
 *   holds the JWT.
 *
 * `useAuthCombined` returns whichever JWT is available to Convex on
 * each request. When both happen to be present (unusual), Clerk wins
 * — keeps existing sessions stable through the transition.
 *
 * Convex backend (`convex/auth.config.ts`) is configured with BOTH the
 * Clerk and Marketing issuers as JWT providers, so it verifies whichever
 * token arrives. `getActor()` in `convex/actors.ts` resolves the user
 * row from the JWT's subject (Clerk) or email (Marketing).
 *
 * When Clerk is fully retired: drop the ClerkProvider wrapper, drop the
 * clerk branch from `useAuthCombined`, drop the Clerk provider from
 * auth.config.ts. Nothing else changes — `useAuth` from
 * `@/contexts/AuthContext` is already the canonical path.
 */

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthCombined() {
  const clerk = useClerkAuth();
  const marketing = useMarketingAuth();

  const isLoading = !clerk.isLoaded || marketing.isLoading;
  const isAuthenticated =
    (clerk.isLoaded && clerk.isSignedIn === true) ||
    marketing.isAuthenticated;

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      // Prefer Clerk if signed in there — keeps legacy sessions stable.
      if (clerk.isLoaded && clerk.isSignedIn) {
        try {
          const token = await clerk.getToken({
            template: 'convex',
            skipCache: forceRefreshToken,
          });
          if (token) return token;
        } catch {
          // Clerk token fetch failed — fall through to Marketing.
        }
      }
      if (marketing.isAuthenticated && marketing.token) {
        return marketing.token;
      }
      return null;
    },
    [clerk, marketing.isAuthenticated, marketing.token],
  );

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

function ConvexAuthBridge({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthCombined}>
      {children}
    </ConvexProviderWithAuth>
  );
}

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
      <AuthProvider>
        <ConvexAuthBridge>{children}</ConvexAuthBridge>
      </AuthProvider>
    </ClerkProvider>
  );
}
