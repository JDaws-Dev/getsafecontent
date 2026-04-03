import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Check for expired trials once per day
 * Expires stale trials and sends warning emails to users expiring in ≤2 days
 */
crons.daily(
  "expire-trials",
  { hourUTC: 5, minuteUTC: 0 }, // Run at 5:00 AM UTC daily
  internal.trialExpirationActions.runTrialExpirationCheck
);

/**
 * Refresh free book cache weekly (Gutenberg adds ~50-100 books/month, mostly not children's)
 * Clears expired cache entries so the next page load fetches fresh results
 */
crons.weekly(
  "refresh-free-book-cache",
  { dayOfWeek: "sunday", hourUTC: 6, minuteUTC: 0 },
  internal.freeBooks.clearExpiredCache
);

export default crons;
