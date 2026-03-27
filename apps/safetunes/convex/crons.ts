import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Process batched email notifications every 5 minutes
 * Checks for batches ready to send and triggers email delivery
 */
crons.interval(
  "process-email-batches",
  { minutes: 5 }, // Run every 5 minutes
  internal.emailNotifications.processEmailBatches
);

/**
 * Clean up old sent email batches once per day
 * Prevents database bloat by removing batches older than 30 days
 */
crons.daily(
  "cleanup-old-batches",
  { hourUTC: 3, minuteUTC: 0 }, // Run at 3:00 AM UTC daily
  internal.emailNotifications.cleanupOldBatches
);

/**
 * Check for orphaned records once per day
 * Detects data integrity issues where child records reference non-existent parents
 * Sends alert email to admin if orphans are found
 */
crons.daily(
  "check-orphaned-records",
  { hourUTC: 4, minuteUTC: 0 }, // Run at 4:00 AM UTC daily (1 hour after cleanup)
  internal.orphanDetection.checkAndAlertOrphans
);

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
