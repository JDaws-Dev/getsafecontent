import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Check for expired trials daily at 5 AM UTC.
 * - Expires stale trials and sends expired emails
 * - Sends warning emails to users expiring in ≤2 days
 */
crons.daily(
  "check-trial-expiration",
  { hourUTC: 5, minuteUTC: 0 },
  internal.trialExpiration.runTrialExpirationCheck
);

/**
 * Clean expired search cache entries daily at 4 AM UTC.
 */
crons.daily(
  "clean-expired-cache",
  { hourUTC: 4, minuteUTC: 0 },
  internal.searchCache.cleanExpiredCache
);

/**
 * Clean stale rate limit records daily at 3 AM UTC.
 * Removes records where the newest timestamp is older than 1 hour.
 */
crons.daily(
  "clean-rate-limits",
  { hourUTC: 3, minuteUTC: 0 },
  internal.rateLimit.cleanupOldRecords
);

/**
 * Weekly parent digest — Sundays at 23:00 UTC (Sunday evening in the US).
 * Reports the past 7 days per kid: intent breakdown, blocked count,
 * concerning patterns, heaviest day, total searches.
 * Opt out via users.weeklyDigestOptOut.
 */
crons.weekly(
  "send-weekly-parent-digest",
  { dayOfWeek: "sunday", hourUTC: 23, minuteUTC: 0 },
  internal.weeklyDigest.sendAll
);

export default crons;
