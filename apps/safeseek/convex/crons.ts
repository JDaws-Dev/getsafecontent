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

export default crons;
