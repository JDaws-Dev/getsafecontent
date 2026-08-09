"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Reading-time accrual + the daily-limit verdict, for every kid-facing surface
 * that serves content (the book reader, the Bible, the audiobook player).
 *
 * WHAT COUNTS AS USAGE — the whole point of this hook.
 * Only time a child is genuinely consuming something:
 *   - Reading: the reader is open AND they've scrolled/tapped/typed within the
 *     last two minutes AND the tab is in the foreground.
 *   - Listening: audio is actually playing. No interaction needed (you don't
 *     touch the screen while listening) and it counts in the background,
 *     because it is still being consumed.
 * Idle time with a page merely parked open counts for nothing. SafeTube's
 * player, left running overnight, once logged 19-hour days and made that
 * child's limit meaningless — this hook exists so SafeReads can't repeat it.
 *
 * It also pushes SafeReads' minutes to Marketing Central every 60 seconds so
 * the family-wide cross-app limit sees them. Fire-and-forget: a failed sync
 * must never interrupt a child's book.
 */

/** How often we settle up the accrued seconds. */
const TICK_MS = 30_000;
/** No scroll/tap/key for this long and reading stops counting. */
const IDLE_MS = 120_000;
/** Push to Marketing Central this often while a kid is active. */
const SYNC_MS = 60_000;
/** Don't bank a write for less than this. */
const FLUSH_THRESHOLD_S = 30;

export type ReadingTimeStatus = {
  canRead: boolean;
  reason: null | "family_limit_reached" | "limit_reached" | "outside_hours";
  scope: "family" | "app" | "none";
  dailyLimitMinutes: number | null;
  minutesUsed: number;
  minutesRemaining: number | null;
  allowedStartHour?: number;
  allowedEndHour?: number;
};

interface Options {
  kidId: Id<"kids"> | null | undefined;
  /** Is the child consuming content right now? (reader open, audio playing) */
  enabled: boolean;
  /**
   * Require recent interaction + a foreground tab for time to count.
   * True for reading, false for audio playback.
   */
  requireInteraction?: boolean;
}

/**
 * Returns the current limit verdict (undefined while loading — treat as
 * allowed, never block on a pending query).
 */
export function useReadingTime({
  kidId,
  enabled,
  requireInteraction = true,
}: Options): ReadingTimeStatus | undefined {
  const recordUsage = useMutation(api.timeLimits.recordUsage);
  const syncShared = useAction(api.sharedScreenTime.sync);

  const status = useQuery(
    api.timeLimits.canRead,
    kidId ? { kidId } : "skip"
  ) as ReadingTimeStatus | undefined;

  // Read inside the interval callbacks without re-arming the timers.
  const enabledRef = useRef(enabled);
  const requireInteractionRef = useRef(requireInteraction);
  const blockedRef = useRef(false);
  useEffect(() => {
    enabledRef.current = enabled;
    requireInteractionRef.current = requireInteraction;
    // Once the child is over their limit the content is withheld, so there is
    // nothing left to meter. Without this the timer would keep billing them
    // while they sit on the "time's up" screen.
    blockedRef.current = status?.canRead === false;
  }, [enabled, requireInteraction, status?.canRead]);

  // Seeded in the accrual effect below, not at render — a clock read during
  // render is impure and React's lint rules (rightly) reject it.
  const lastActivityRef = useRef(0);
  const lastTickRef = useRef(0);
  const pendingSecondsRef = useRef(0);

  // Track real interaction. Capture phase so scrolls inside the reader's own
  // scroll container are seen too.
  useEffect(() => {
    const mark = () => { lastActivityRef.current = Date.now(); };
    const events: (keyof WindowEventMap)[] = [
      "pointerdown", "keydown", "wheel", "touchstart", "touchmove", "scroll", "mousemove",
    ];
    for (const ev of events) {
      window.addEventListener(ev, mark, { passive: true, capture: true });
    }
    return () => {
      for (const ev of events) {
        window.removeEventListener(ev, mark, { capture: true } as EventListenerOptions);
      }
    };
  }, []);

  // Accrue and flush.
  useEffect(() => {
    if (!kidId) return;

    lastTickRef.current = Date.now();
    lastActivityRef.current = Date.now();

    const flush = () => {
      const whole = Math.floor(pendingSecondsRef.current);
      if (whole <= 0) return;
      pendingSecondsRef.current -= whole;
      recordUsage({ kidId, seconds: whole }).catch(() => {
        /* offline — the next tick will try again with fresh time */
      });
    };

    const tick = () => {
      const now = Date.now();
      // Cap the delta: a throttled or suspended tab can return a huge gap that
      // was obviously not spent reading.
      const elapsedS = Math.min((now - lastTickRef.current) / 1000, (TICK_MS * 2) / 1000);
      lastTickRef.current = now;

      if (!enabledRef.current || blockedRef.current) return;
      if (requireInteractionRef.current) {
        if (document.visibilityState !== "visible") return;
        if (now - lastActivityRef.current > IDLE_MS) return;
      }

      pendingSecondsRef.current += elapsedS;
      if (pendingSecondsRef.current >= FLUSH_THRESHOLD_S) flush();
    };

    const id = setInterval(tick, TICK_MS);
    return () => {
      clearInterval(id);
      tick();  // bank the partial interval before we go
      flush(); // ...and send whatever's left, however small
    };
  }, [kidId, recordUsage]);

  // Report to Marketing Central so the family-wide limit sees SafeReads.
  // Without this the shared limit sits dormant and a child could burn their
  // whole allowance reading while the other four apps never find out.
  useEffect(() => {
    if (!kidId) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      syncShared({ kidId }).catch(() => {
        /* central down — the per-app limit still applies */
      });
    };
    run();
    const id = setInterval(run, SYNC_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [kidId, syncShared]);

  return status;
}

/** Kid-friendly one-liner for why reading is paused. */
export function limitMessage(status: ReadingTimeStatus | undefined): string {
  if (status?.reason === "outside_hours") {
    return "Reading time isn't open right now. Come back a bit later!";
  }
  return "That's all your reading time for today. See you tomorrow!";
}
