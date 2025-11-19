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

/**
 * Weekly webhook events cleanup job
 *
 * Runs every Sunday at 02:00 UTC to remove webhook event records
 * older than 30 days. Prevents the webhookEvents table from growing
 * indefinitely while maintaining replay attack protection.
 */
crons.weekly(
  "cleanup-old-webhook-events",
  {
    hourUTC: 2, // Run at 2 AM UTC on Sundays
    minuteUTC: 0,
    dayOfWeek: "sunday",
  },
  internal.webhooks.cleanupOldEvents
);

/**
 * Hourly upload rate limit records cleanup job
 *
 * Runs every hour to remove upload rate limit records older than 1 hour.
 * Keeps the uploadRateLimits table lean while maintaining effective rate limiting.
 */
crons.hourly(
  "cleanup-old-upload-records",
  {
    minuteUTC: 30, // Run at 30 minutes past each hour
  },
  internal.uploadRateLimit.cleanupOldUploadRecords
);

export default crons;
