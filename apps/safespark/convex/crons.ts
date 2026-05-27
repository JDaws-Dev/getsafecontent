import { cronJobs } from 'convex/server';

const crons = cronJobs();

// No active cron jobs for SafeSpark v1. The trainer's daily-card cron was
// stripped along with the rest of the BELLA trainer code; a future relaunch
// can re-introduce its own crons here.

export default crons;
