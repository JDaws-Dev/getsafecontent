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

export default crons;
