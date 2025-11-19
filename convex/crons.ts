/**
 * Convex scheduled tasks (cron jobs)
 *
 * Defines recurring jobs for quota resets and other maintenance tasks.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Daily quota reset job
 *
 * Runs every day at 00:00 UTC to check for expired billing periods
 * and reset quotas for affected users.
 */
crons.daily(
  "reset-expired-quotas",
  {
    hourUTC: 0, // Run at midnight UTC
    minuteUTC: 0,
  },
  internal.quotas.resetExpiredQuotas
);

export default crons;
