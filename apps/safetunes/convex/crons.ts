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

export default crons;
