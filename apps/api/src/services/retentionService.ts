import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Submission } from '../models/Submission.js';
import { storage } from '../utils/storage.js';

/**
 * Scheduled job: Deletes media older than MEDIA_RETENTION_DAYS (default 7 days)
 * while keeping the Analysis text, summary, tactics, and findings intact.
 */
export async function runMediaRetentionCleanup(
  retentionDays?: number
): Promise<{ deletedMediaCount: number }> {
  const days = retentionDays ?? env.MEDIA_RETENTION_DAYS ?? 7;
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  logger.info({ cutoffDate, days }, 'Starting media retention cleanup job');

  // Query submissions created before cutoffDate that have media stored
  const expiredSubmissions = await Submission.find({
    createdAt: { $lt: cutoffDate },
    storageKey: { $exists: true, $ne: null }
  });

  let deletedCount = 0;

  for (const sub of expiredSubmissions) {
    if (sub.storageKey) {
      try {
        await storage.delete(sub.storageKey);
        sub.storageKey = undefined;
        await sub.save();
        deletedCount++;
      } catch (err: any) {
        logger.warn(
          { err: err.message, submissionId: sub._id, storageKey: sub.storageKey },
          'Failed to delete expired media file'
        );
      }
    }
  }

  logger.info(
    { deletedCount, cutoffDate, days },
    'Media retention cleanup completed (analysis text preserved)'
  );

  return { deletedMediaCount: deletedCount };
}

/**
 * Schedules the retention cleanup job to run every 24 hours.
 */
export function scheduleRetentionJob(): NodeJS.Timeout {
  // Run 15s after startup
  setTimeout(() => {
    runMediaRetentionCleanup().catch((err) =>
      logger.error({ err: err.message }, 'Initial media retention cleanup run failed')
    );
  }, 15000);

  // Recurring 24-hour interval
  const interval = setInterval(() => {
    runMediaRetentionCleanup().catch((err) =>
      logger.error({ err: err.message }, 'Scheduled 24h media retention cleanup run failed')
    );
  }, 24 * 60 * 60 * 1000);

  return interval;
}
