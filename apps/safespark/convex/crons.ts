import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Daily cleanup of stale async build jobs (see safesparkJobs in schema).
// The canonical project state lives on safesparkProjects; the job row is
// just a streaming artifact for rehydration when the client disconnects
// mid-build. 24h retention is generous — kids don't typically come back
// to a half-built project days later.
crons.daily(
  'cleanup-old-build-jobs',
  { hourUTC: 7, minuteUTC: 0 }, // 7am UTC = 2-3am ET, low traffic
  internal.jobs._cleanupOldJobs,
);

export default crons;
