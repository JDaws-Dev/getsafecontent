'use client';

import { ReactNode, useCallback, useMemo } from 'react';
import { ConvexReactClient, ConvexProviderWithAuth } from 'convex/react';
import { AuthProvider, useAuth as useMarketingAuth } from '@/contexts/AuthContext';

/**
 * Convex client + Marketing Central JWT auth bridge.
 *
 * Clerk was retired on 2026-05-28. Marketing Central is the sole identity
 * provider for SafeSpark parents now; kids continue to use the family-code
 * session-token flow (handled inside Convex queries via `sessionToken` args).
 *
 * If a request has no Marketing JWT and no kid session, the Convex
 * `getActor()` helper throws — every authed query / mutation in the app
 * already handles that as "guest", so unauthenticated visitors gracefully
 * hit the family-code gate at /start or /make.
 */

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

function useAuthForConvex() {
  const { isLoading, isAuthenticated, token } = useMarketingAuth();

  const fetchAccessToken = useCallback(async () => {
    return token ?? null;
  }, [token]);

  return useMemo(
    () => ({ isLoading, isAuthenticated, fetchAccessToken }),
    [isLoading, isAuthenticated, fetchAccessToken],
  );
}

function ConvexAuthBridge({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuthForConvex}>
      {children}
    </ConvexProviderWithAuth>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConvexAuthBridge>{children}</ConvexAuthBridge>
    </AuthProvider>
  );
}
