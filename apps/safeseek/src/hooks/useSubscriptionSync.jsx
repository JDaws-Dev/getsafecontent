import { useEffect, useRef, useCallback } from 'react';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuth } from '../contexts/AuthContext';

// How often to recheck subscription status (1 hour in ms)
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

// Re-sync on tab focus only if the last sync is older than this
const STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * Hook to sync subscription status with the central Safe Family service.
 *
 * SafeStudy stores its own copy of subscriptionStatus (every AI call gates on it
 * via users.checkSubscriptionActive), so it has to PULL central's authoritative
 * answer or it never learns about a comp, a new subscription, or a cancellation.
 *
 * Features:
 * - Syncs on mount (when the parent is authenticated)
 * - Syncs periodically (hourly)
 * - Syncs when the tab becomes visible (if stale)
 *
 * @returns {{ syncNow: () => Promise<void> }}
 */
export function useSubscriptionSync() {
  const { user: currentUser, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const verifyCentralAccess = useAction(api.userSync.verifyCentralAccess);

  // Track sync state
  const lastSyncRef = useRef(null);
  const intervalRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Perform the sync
  const syncNow = useCallback(async () => {
    // Don't sync if already syncing, not authenticated, or no user with email
    if (isSyncingRef.current || !isAuthenticated || !currentUser?.email) {
      return;
    }

    isSyncingRef.current = true;

    try {
      // The token lets the server verify WHICH account is being synced instead
      // of trusting the email we pass (convex/identity.ts).
      const result = await verifyCentralAccess({
        email: currentUser.email,
        userToken: token || undefined,
      });
      lastSyncRef.current = Date.now();

      if (!result.cached) {
        console.log('[useSubscriptionSync] Synced with central:', {
          hasAccess: result.hasAccess,
          status: result.subscriptionStatus,
          reason: result.reason,
        });
      }
    } catch (error) {
      console.error('[useSubscriptionSync] Sync failed:', error);
    } finally {
      isSyncingRef.current = false;
    }
  }, [isAuthenticated, currentUser, token, verifyCentralAccess]);

  // Sync on mount and when auth state changes
  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !currentUser) {
      return;
    }

    // Sync immediately on mount
    syncNow();

    // Set up periodic sync
    intervalRef.current = setInterval(syncNow, SYNC_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isAuthLoading, isAuthenticated, currentUser, syncNow]);

  // Sync when the tab becomes visible (if it's been a while)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastSync = Date.now() - (lastSyncRef.current || 0);
        if (timeSinceLastSync > STALE_AFTER_MS) {
          console.log('[useSubscriptionSync] Tab became visible, re-syncing...');
          syncNow();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncNow]);

  return {
    syncNow,
    // Note: the sync bookkeeping lives in refs so it won't trigger re-renders.
    // That's intentional — the sync happens in the background.
  };
}

/**
 * Mountable wrapper for useSubscriptionSync.
 *
 * Renders nothing — it exists so the sync can live at the app ROOT rather than
 * being hand-wired into individual pages. Page-level mounting is what fails in
 * practice: a parent who lands straight on /admin (or never visits whichever
 * page owns the hook) never triggers a sync, so a central comp never reaches
 * SafeStudy and the customer stays locked out. At the root it runs for every
 * authenticated session, on every route.
 *
 * Must be rendered inside AuthProvider (it reads useAuth) and inside
 * ConvexProvider (it calls useAction). Safe to mount above the router: the hook
 * no-ops unless there's an authenticated parent with an email, so kid sessions
 * on /search never trigger it.
 */
export function SubscriptionSync() {
  useSubscriptionSync();
  return null;
}

export default useSubscriptionSync;
