import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Consent } from '../models/Consent.js';
import { logger } from '../config/logger.js';

export async function seedDemoAccounts(): Promise<void> {
  try {
    const passwordHash = await bcrypt.hash('DemoPass123!', 10);

    // 1. Seed or update Ramesh Sharma (Senior)
    let senior = await User.findOne({ email: 'ramesh.senior@example.com' });
    if (!senior) {
      senior = await User.create({
        name: 'Ramesh Sharma',
        email: 'ramesh.senior@example.com',
        passwordHash,
        role: 'senior',
        phone: '+919876543210',
        preferredLanguage: 'en'
      });
      logger.info('Seeded demo senior user: ramesh.senior@example.com');
    } else {
      senior.passwordHash = passwordHash;
      await senior.save();
    }

    // 2. Seed or update Priya Sharma (Family Member)
    let family = await User.findOne({ email: 'priya.family@example.com' });
    if (!family) {
      family = await User.create({
        name: 'Priya Sharma',
        email: 'priya.family@example.com',
        passwordHash,
        role: 'family',
        phone: '+919876543211',
        preferredLanguage: 'en'
      });
      logger.info('Seeded demo family user: priya.family@example.com');
    } else {
      family.passwordHash = passwordHash;
      await family.save();
    }

    // 3. Seed active Consent link between senior and family member
    let consent = await Consent.findOne({ seniorId: senior._id, familyId: family._id });
    if (!consent) {
      consent = await Consent.create({
        seniorId: senior._id,
        familyId: family._id,
        inviteCode: 'DEMO99',
        inviteExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000),
        status: 'active',
        shareLevel: 'summary_and_media',
        alertThreshold: 'medium',
        acceptedAt: new Date()
      });
      logger.info('Seeded active family Consent link between Ramesh and Priya');
    }

  } catch (err: any) {
    logger.warn({ error: err.message }, 'Demo account auto-seeding warning (non-fatal)');
  }
}
