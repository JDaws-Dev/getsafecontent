import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Send consolidated trial summary digest.
 * Runs at 5:30 AM UTC — 30 min after the last app's trial check (5:00 AM UTC).
 * Collects all app reports from the last 24 hours and sends one admin email.
 */
crons.daily(
  "trial-summary-digest",
  { hourUTC: 5, minuteUTC: 30 },
  internal.trialSummaryDigest.sendConsolidatedDigest
);

export default crons;
