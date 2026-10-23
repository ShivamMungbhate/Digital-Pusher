import { connectDB, disconnectDB } from '../config/db.js';
import { logger } from '../config/logger.js';
import { User } from '../models/User.js';
import { Consent } from '../models/Consent.js';
import { Submission } from '../models/Submission.js';
import { Analysis } from '../models/Analysis.js';
import { Alert } from '../models/Alert.js';
import { TelegramLink } from '../models/TelegramLink.js';
import { storage } from '../utils/storage.js';
import { seedDemoData } from './seed.js';

export async function clearDemoData(): Promise<void> {
  logger.info('Clearing all existing demo accounts and associated data...');

  const demoUsers = await User.find({
    email: { $in: ['ramesh.senior@example.com', 'priya.family@example.com'] }
  });

  const demoUserIds = demoUsers.map((u) => u._id);

  if (demoUserIds.length > 0) {
    // 1. Delete stored media files from disk
    const demoSubmissions = await Submission.find({ userId: { $in: demoUserIds } });
    for (const sub of demoSubmissions) {
      if (sub.storageKey) {
        try {
          await storage.delete(sub.storageKey);
        } catch (err: any) {
          logger.warn({ err: err.message, storageKey: sub.storageKey }, 'Failed to delete demo media file');
        }
      }
    }

    // 2. Delete Submissions and Analyses
    await Submission.deleteMany({ userId: { $in: demoUserIds } });
    await Analysis.deleteMany({ userId: { $in: demoUserIds } });

    // 3. Delete Alerts involving demo users
    await Alert.deleteMany({
      $or: [
        { seniorId: { $in: demoUserIds } },
        { familyId: { $in: demoUserIds } }
      ]
    });

    // 4. Delete Consents involving demo users
    await Consent.deleteMany({
      $or: [
        { seniorId: { $in: demoUserIds } },
        { familyId: { $in: demoUserIds } }
      ]
    });

    // 5. Delete TelegramLinks
    await TelegramLink.deleteMany({ userId: { $in: demoUserIds } });

    // 6. Delete Users
    await User.deleteMany({ _id: { $in: demoUserIds } });

    logger.info({ count: demoUserIds.length }, 'Deleted demo users and all associated records');
  } else {
    logger.info('No existing demo accounts found to clear');
  }
}

export async function resetAndReseedDemo(): Promise<void> {
  logger.info('Starting full demo reset and re-seed pipeline...');
  await clearDemoData();
  await seedDemoData();
  logger.info('Demo reset and re-seed complete! Fresh demo state ready.');
}

async function runStandalone() {
  try {
    await connectDB();
    await resetAndReseedDemo();
    process.exit(0);
  } catch (err: any) {
    logger.error({ error: err.message }, 'demo:reset failed');
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('demoReset.ts') || process.argv[1]?.endsWith('demoReset.js')) {
  runStandalone();
}
