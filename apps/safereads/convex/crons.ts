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

export default crons;
