'use client';

import { useEffect, useRef } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

/**
 * Kid-side screen-time heartbeat for the build workbench.
 *
 * WHAT COUNTS AS USAGE: active building time. A beat is only sent when the
 * tab is visible AND either a build is running or the kid touched something
 * in the last few minutes. An open tab sitting idle sends nothing and costs
 * nothing — SafeTube learned this the hard way when a player left running
 * overnight logged 19-hour days for a kid who was asleep.
 *
 * The server clamps every beat against real elapsed wall-clock time, so this
 * timer can't inflate usage; and /api/demo records a floor per build, so a
 * client that stops beating can't erase it either.
 *
 * Everything here fails open. If Convex is unreachable or the token is
 * stale, `outOfTime` stays false and the kid keeps building.
 */

const BEAT_MS = 60_000;
/** How long after the last interaction we still count the kid as building. */
const IDLE_GRACE_MS = 3 * 60_000;
/** Matches the server's per-call clamp. */
const MAX_BEAT_SECONDS = 150;

export type KidScreenTime = {
  /** True only when we positively know the kid is over their limit. */
  outOfTime: boolean;
  /** Minutes left today, or null when no limit applies. */
  remainingMinutes: number | null;
  /** The limit in minutes, or null when none applies. */
  limitMinutes: number | null;
  /** Which limit is governing — one overall limit, this app's own, or none. */
  scope: 'family' | 'app' | 'none';
};

export function useKidScreenTime(
  sessionToken: string | null,
  isBuilding: boolean,
): KidScreenTime {
  const status = useQuery(
    api.screenTime.kidStatus,
    sessionToken ? { sessionToken } : 'skip',
  );
  const recordActive = useMutation(api.screenTime.recordActive);
  const syncShared = useAction(api.sharedScreenTime.sync);

  // Seeded in the beat effect below, not during render — Date.now() is impure
  // and refs must not be written while rendering.
  const lastInteractionRef = useRef<number>(0);
  const lastBeatRef = useRef<number>(0);
  const isBuildingRef = useRef(false);

  useEffect(() => {
    isBuildingRef.current = isBuilding;
    // A build starting is itself a sign the kid is here.
    if (isBuilding) lastInteractionRef.current = Date.now();
  }, [isBuilding]);

  // Any real input counts as "still here". Pointer/key/scroll only — mouse
  // movement alone would make a forgotten tab look active.
  useEffect(() => {
    if (!sessionToken) return;
    const touch = () => {
      lastInteractionRef.current = Date.now();
    };
    const events: (keyof WindowEventMap)[] = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    for (const event of events) window.addEventListener(event, touch, { passive: true });
    return () => {
      for (const event of events) window.removeEventListener(event, touch);
    };
  }, [sessionToken]);

  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    lastBeatRef.current = Date.now();
    lastInteractionRef.current = Date.now();

    const timezone = (() => {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
      } catch {
        return undefined;
      }
    })();

    const beat = async () => {
      if (cancelled) return;
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        // Hidden tab: don't credit time, and don't reset the watermark —
        // the server clamps by elapsed time anyway.
        return;
      }

      const now = Date.now();
      const active =
        isBuildingRef.current || now - lastInteractionRef.current < IDLE_GRACE_MS;

      if (active) {
        const seconds = Math.min(
          MAX_BEAT_SECONDS,
          Math.max(0, Math.round((now - lastBeatRef.current) / 1000)),
        );
        lastBeatRef.current = now;
        if (seconds > 0) {
          try {
            await recordActive({ sessionToken, activeSeconds: seconds, timezone });
          } catch {
            /* fail open — a missed beat must never interrupt a build */
          }
        }
      } else {
        lastBeatRef.current = now;
      }

      // Push the delta to Marketing Central and refresh the cached verdict.
      // Runs even on an idle-but-visible beat so the cached family limit
      // doesn't go stale under a kid who steps away and comes back.
      try {
        await syncShared({ sessionToken, timezone });
      } catch {
        /* central unreachable — the local limit still governs */
      }
    };

    // One immediate pass so a kid who opens the app already over their limit
    // sees it before typing, rather than a minute later.
    void beat();
    const id = setInterval(() => void beat(), BEAT_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sessionToken, recordActive, syncShared]);

  return {
    outOfTime: status?.known === true && status.allowed === false,
    remainingMinutes: status?.remainingMinutes ?? null,
    limitMinutes: status?.limitMinutes ?? null,
    scope: (status?.scope ?? 'none') as 'family' | 'app' | 'none',
  };
}
