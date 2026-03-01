import { useEffect, useRef, useCallback } from 'react';
import { useConvexAuth, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

// How often to recheck subscription status (1 hour in ms)
const SYNC_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Hook to sync subscription status with central Safe Family service.
 *
 * This ensures the local app's subscription status stays in sync with
 * the central service. If a user's subscription expires or is cancelled,
 * this will detect it within the sync interval.
 *
 * Features:
 * - Syncs on mount (when user is authenticated)
 * - Syncs periodically (hourly)
 * - Syncs when tab becomes visible (if stale)
 *
 * @returns {{
 *   isSyncing: boolean,
 *   lastSyncAt: number | null,
 *   syncNow: () => Promise<void>,
 *   error: string | null
 * }}
 */
export function useSubscriptionSync() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const currentUser = useQuery(api.userSync.getCurrentUser);
  const verifyCentralAccess = useAction(api.userSync.verifyCentralAccess);

  // Track sync state
  const lastSyncRef = useRef(null);
  const intervalRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Perform the sync
  const syncNow = useCallback(async () => {
    // Don't sync if already syncing, not authenticated, or no user
    if (isSyncingRef.current || !isAuthenticated || !currentUser) {
      return;
    }

    isSyncingRef.current = true;

    try {
      const result = await verifyCentralAccess();
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
  }, [isAuthenticated, currentUser, verifyCentralAccess]);

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

  // Sync when tab becomes visible (if it's been a while)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastSync = Date.now() - (lastSyncRef.current || 0);
        // Re-sync if it's been more than 5 minutes since last sync
        if (timeSinceLastSync > 5 * 60 * 1000) {
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
    // Note: These are refs so they won't trigger re-renders on change
    // That's intentional - the sync happens in the background
  };
}

export default useSubscriptionSync;
