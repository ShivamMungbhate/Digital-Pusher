import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { Types } from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Submission } from '../src/models/Submission.js';
import { Analysis } from '../src/models/Analysis.js';
import { Alert } from '../src/models/Alert.js';
import { Consent } from '../src/models/Consent.js';
import { TelegramLink } from '../src/models/TelegramLink.js';
import { storage } from '../src/utils/storage.js';
import { runMediaRetentionCleanup } from '../src/services/retentionService.js';
import { env } from '../src/config/env.js';

describe('Privacy & Auto-Delete Engine (Task 2)', () => {
  let app: any;
  let userToken: string;
  let userId: string;
  let familyUser: any;

  beforeAll(async () => {
    await connectDB();
    app = createApp();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Submission.deleteMany({});
    await Analysis.deleteMany({});
    await Alert.deleteMany({});
    await Consent.deleteMany({});
    await TelegramLink.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Submission.deleteMany({});
    await Analysis.deleteMany({});
    await Alert.deleteMany({});
    await Consent.deleteMany({});
    await TelegramLink.deleteMany({});

    // Register a fresh senior user
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Privacy Test Senior',
        email: `privacy.${Date.now()}@example.com`,
        password: 'Password123!',
        role: 'senior'
      });

    userToken = res.body.tokens.accessToken;
    userId = res.body.user.id;

    // Create a family user for linking
    familyUser = await User.create({
      name: 'Privacy Test Family',
      email: `family.${Date.now()}@example.com`,
      passwordHash: 'hash',
      role: 'family'
    });
  });

  it('scheduled retention cleanup deletes media older than MEDIA_RETENTION_DAYS and keeps Analysis text', async () => {
    // 1. Create a dummy media file via storage
    const testBuffer = Buffer.from('Encrypted audio recording content for retention test');
    const { storageKey } = await storage.save(testBuffer, 'call.mp3');

    // Verify file exists on disk
    const filePath = path.join(path.resolve(env.STORAGE_PATH), storageKey);
    await expect(fs.access(filePath)).resolves.not.toThrow();

    // 2. Create an expired submission (e.g. 10 days old, default retention is 7)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const expiredSub = await Submission.create({
      userId,
      mode: 'scam',
      language: 'en',
      sourceType: 'audio',
      storageKey,
      status: 'done',
      createdAt: tenDaysAgo
    });

    // 3. Create associated Analysis with text
    const analysis = await Analysis.create({
      submissionId: expiredSub._id,
      userId,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.95,
      summary: 'Critical scam: extortion threat detected via phone call',
      tactics: [{ name: 'fear', evidence: 'threat', severity: 'high' }],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Never wire funds'],
      drafts: [],
      disclaimer: 'Informational analysis'
    });

    // 4. Create a fresh recent submission (e.g. 1 day old) with media
    const freshBuffer = Buffer.from('Recent voice clip');
    const { storageKey: freshStorageKey } = await storage.save(freshBuffer, 'fresh.mp3');
    const freshFilePath = path.join(path.resolve(env.STORAGE_PATH), freshStorageKey);

    const freshSub = await Submission.create({
      userId,
      mode: 'scam',
      language: 'en',
      sourceType: 'audio',
      storageKey: freshStorageKey,
      status: 'done',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });

    // 5. Run the media retention cleanup job with 7 days limit
    const result = await runMediaRetentionCleanup(7);
    expect(result.deletedMediaCount).toBeGreaterThanOrEqual(1);

    // 6. Verify: Old media file on disk is DELETED
    await expect(fs.access(filePath)).rejects.toThrow();

    // 7. Verify: Expired submission updated (storageKey is undefined)
    const updatedSub = await Submission.findById(expiredSub._id);
    expect(updatedSub?.storageKey).toBeUndefined();

    // 8. Verify: Analysis text is completely PRESERVED
    const preservedAnalysis = await Analysis.findOne({ submissionId: expiredSub._id });
    expect(preservedAnalysis).toBeDefined();
    expect(preservedAnalysis?.summary).toBe('Critical scam: extortion threat detected via phone call');
    expect(preservedAnalysis?.verdict).toBe('likely_scam');
    expect(preservedAnalysis?.tactics.length).toBe(1);

    // 9. Verify: Fresh media file is KEPT on disk
    await expect(fs.access(freshFilePath)).resolves.not.toThrow();

    // Clean up fresh file
    await storage.delete(freshStorageKey);
  });

  it('DELETE /api/me removes submissions, media, alerts, and consents', async () => {
    // 1. Create a submission with stored encrypted media
    const mediaBuffer = Buffer.from('Sensitive voice message about bank fraud');
    const { storageKey } = await storage.save(mediaBuffer, 'evidence.mp3');
    const filePath = path.join(path.resolve(env.STORAGE_PATH), storageKey);
    await expect(fs.access(filePath)).resolves.not.toThrow();

    const sub = await Submission.create({
      userId,
      mode: 'scam',
      language: 'en',
      sourceType: 'audio',
      storageKey,
      status: 'done'
    });

    const analysis = await Analysis.create({
      submissionId: sub._id,
      userId,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.9,
      summary: 'Impersonation scam',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: [],
      drafts: [],
      disclaimer: 'Informational'
    });

    // 2. Create an alert for this senior
    await Alert.create({
      seniorId: userId,
      familyId: familyUser._id,
      submissionId: sub._id,
      analysisId: analysis._id,
      risk: 'high',
      title: 'Scam Alert',
      summary: 'Impersonation threat',
      suggestedAction: 'Call immediately',
      mediaIncluded: true,
      channelsSent: [{ channel: 'email', status: 'sent', sentAt: new Date() }],
      status: 'unread'
    });

    // 3. Create active consent linking senior and family
    await Consent.create({
      seniorId: userId,
      familyId: familyUser._id,
      inviteCode: 'DEL999',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary_and_media',
      alertThreshold: 'medium'
    });

    // 4. Create telegram link
    await TelegramLink.create({
      userId,
      chatId: '123456789',
      isLinked: true
    });

    // Verify all records exist prior to deletion
    expect(await Submission.countDocuments({ userId })).toBe(1);
    expect(await Analysis.countDocuments({ userId })).toBe(1);
    expect(await Alert.countDocuments({ seniorId: userId })).toBe(1);
    expect(await Consent.countDocuments({ seniorId: userId })).toBe(1);
    expect(await TelegramLink.countDocuments({ userId })).toBe(1);

    // 5. Call DELETE /api/me
    const delRes = await request(app)
      .delete('/api/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.message).toContain('permanently deleted');

    // 6. Verify: Physical encrypted media file is DELETED
    await expect(fs.access(filePath)).rejects.toThrow();

    // 7. Verify: Submissions and Analyses are DELETED
    expect(await Submission.countDocuments({ userId })).toBe(0);
    expect(await Analysis.countDocuments({ userId })).toBe(0);

    // 8. Verify: Alerts are DELETED
    expect(await Alert.countDocuments({ seniorId: userId })).toBe(0);

    // 9. Verify: Consents are DELETED
    expect(await Consent.countDocuments({ seniorId: userId })).toBe(0);

    // 10. Verify: Telegram link is DELETED
    expect(await TelegramLink.countDocuments({ userId })).toBe(0);

    // 11. Verify: User account is DELETED
    const userInDb = await User.findById(userId);
    expect(userInDb).toBeNull();

    // 12. Verify: Deleted user's token is now unauthorized
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);
    expect(meRes.status).toBe(401);
  });
});
