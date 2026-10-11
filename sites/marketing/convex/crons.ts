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

/**
 * Quiet-days alerts: email a parent when a kid who normally uses SafeTube (or
 * SafeTunes) most days has gone silent. 11:00 UTC is after midnight for every
 * US family (6-7am Eastern, 3-4am Pacific, 1am Hawaii), so "yesterday" is a
 * complete day in each family's own timezone and emails land in the morning.
 */
crons.daily(
  "inactivity-alerts",
  { hourUTC: 11, minuteUTC: 0 },
  internal.inactivityAlerts.runDaily,
  {}
);

/** Drop finished/expired device-check tokens after a week. */
crons.daily(
  "device-checks-cleanup",
  { hourUTC: 9, minuteUTC: 15 },
  internal.deviceChecks.cleanup,
  {}
);

export default crons;
