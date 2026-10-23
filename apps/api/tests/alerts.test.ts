import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User, IUser } from '../src/models/User.js';
import { Consent, IConsent } from '../src/models/Consent.js';
import { Submission, ISubmission } from '../src/models/Submission.js';
import { Analysis, IAnalysis } from '../src/models/Analysis.js';
import { Alert } from '../src/models/Alert.js';
import { TelegramLink } from '../src/models/TelegramLink.js';
import { triggerFamilyAlerts } from '../src/services/alertService.js';

describe('Family Alert Engine (Task 1)', () => {
  let seniorUser: IUser;
  let familyUser: IUser;

  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Consent.deleteMany({});
    await Submission.deleteMany({});
    await Analysis.deleteMany({});
    await Alert.deleteMany({});
    await TelegramLink.deleteMany({});
    await disconnectDB();
  });

  beforeEach(async () => {
    await Alert.deleteMany({});
    await Consent.deleteMany({});
    await Submission.deleteMany({});
    await Analysis.deleteMany({});
    await TelegramLink.deleteMany({});

    // Create fresh test users
    seniorUser = await User.create({
      name: 'Ramesh Senior',
      email: `ramesh.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      role: 'senior'
    });

    familyUser = await User.create({
      name: 'Priya Family',
      email: `priya.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw',
      role: 'family'
    });
  });

  it('respects alertThreshold: triggers only when analysis.risk >= consent.alertThreshold', async () => {
    // 1. Consent with alertThreshold = 'high'
    const consent = await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST01',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary',
      alertThreshold: 'high'
    });

    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    // Medium risk analysis -> should NOT trigger when threshold is high
    const mediumAnalysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'medium',
      verdict: 'unclear',
      confidence: 0.7,
      summary: 'Medium suspicious message',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Double check details.'],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    const alertsMedium = await triggerFamilyAlerts(submission, mediumAnalysis);
    expect(alertsMedium.length).toBe(0);

    const dbAlerts1 = await Alert.find({ seniorId: seniorUser._id });
    expect(dbAlerts1.length).toBe(0);

    // High risk analysis -> SHOULD trigger when threshold is high
    const submission2 = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    const highAnalysis = await Analysis.create({
      submissionId: submission2._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.95,
      summary: 'Urgent arrest scam message',
      tactics: [{ name: 'urgency', evidence: 'now', severity: 'high' }],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Do not pay.'],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    const alertsHigh = await triggerFamilyAlerts(submission2, highAnalysis);
    expect(alertsHigh.length).toBe(1);
    expect(alertsHigh[0].risk).toBe('high');
    expect(alertsHigh[0].familyId.toString()).toBe(familyUser._id.toString());
    expect(alertsHigh[0].mediaIncluded).toBe(false); // shareLevel is summary
  });

  it('does not send alerts when consent is revoked or pending', async () => {
    // Revoked consent
    await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST02',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'revoked',
      revokedAt: new Date(),
      shareLevel: 'summary',
      alertThreshold: 'medium'
    });

    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    const highAnalysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.95,
      summary: 'Critical threat detected',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: [],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    const alerts = await triggerFamilyAlerts(submission, highAnalysis);
    expect(alerts.length).toBe(0);

    const dbAlerts = await Alert.find({ seniorId: seniorUser._id });
    expect(dbAlerts.length).toBe(0);
  });

  it('dedupes identical alerts within 10 minutes', async () => {
    await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST03',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary',
      alertThreshold: 'medium'
    });

    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    const analysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.9,
      summary: 'Dedupe test: suspicious digital arrest call',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Hang up immediately'],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    // First trigger -> alert created
    const firstTrigger = await triggerFamilyAlerts(submission, analysis);
    expect(firstTrigger.length).toBe(1);

    // Second trigger within 10 mins with identical submission/analysis -> suppressed
    const secondTrigger = await triggerFamilyAlerts(submission, analysis);
    expect(secondTrigger.length).toBe(0);

    const totalAlerts = await Alert.find({ seniorId: seniorUser._id });
    expect(totalAlerts.length).toBe(1);
  });

  it('caps alerts at 3 per hour per senior', async () => {
    await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST04',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary',
      alertThreshold: 'medium'
    });

    // Create 3 existing alerts in the past 30 minutes
    for (let i = 1; i <= 3; i++) {
      await Alert.create({
        seniorId: seniorUser._id,
        familyId: familyUser._id,
        submissionId: seniorUser._id, // placeholder
        risk: 'high',
        title: `Existing alert #${i}`,
        summary: `Prior scam threat #${i}`,
        suggestedAction: 'Take action',
        mediaIncluded: false,
        channelsSent: [{ channel: 'email', status: 'sent', sentAt: new Date() }],
        status: 'unread',
        createdAt: new Date(Date.now() - i * 5 * 60 * 1000) // 5, 10, 15 mins ago
      });
    }

    const currentAlertCount = await Alert.countDocuments({ seniorId: seniorUser._id });
    expect(currentAlertCount).toBe(3);

    // Attempt to trigger a 4th alert for this senior
    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    const analysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.99,
      summary: 'Brand new distinct scam message',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Alert family'],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    const cappedAlerts = await triggerFamilyAlerts(submission, analysis);
    expect(cappedAlerts.length).toBe(0);

    // Total alerts in DB remains capped at 3
    const finalAlertCount = await Alert.countDocuments({ seniorId: seniorUser._id });
    expect(finalAlertCount).toBe(3);
  });

  it('includes media only when shareLevel is summary_and_media', async () => {
    // Consent with shareLevel: 'summary_and_media'
    await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST05',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary_and_media',
      alertThreshold: 'medium'
    });

    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'image',
      storageKey: 'mock-storage-key-12345',
      status: 'done'
    });

    const analysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.9,
      summary: 'Fake electricity bill screenshot',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Do not click link'],
      drafts: [],
      audioUrl: '/audio/test.mp3',
      disclaimer: 'Informational analysis only'
    });

    const alerts = await triggerFamilyAlerts(submission, analysis);
    expect(alerts.length).toBe(1);
    expect(alerts[0].mediaIncluded).toBe(true);
    expect(alerts[0].mediaUrl).toBe(`/api/submissions/${submission._id}/media`);
  });

  it('dispatches to Telegram when family member has an active TelegramLink', async () => {
    await Consent.create({
      seniorId: seniorUser._id,
      familyId: familyUser._id,
      inviteCode: 'TEST06',
      inviteExpiresAt: new Date(Date.now() + 86400000),
      status: 'active',
      shareLevel: 'summary',
      alertThreshold: 'medium'
    });

    // Link Telegram for family user
    await TelegramLink.create({
      userId: familyUser._id,
      chatId: '987654321',
      isLinked: true,
      username: 'priya_telegram'
    });

    const submission = await Submission.create({
      userId: seniorUser._id,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      status: 'done'
    });

    const analysis = await Analysis.create({
      submissionId: submission._id,
      userId: seniorUser._id,
      mode: 'scam',
      risk: 'high',
      verdict: 'likely_scam',
      confidence: 0.92,
      summary: 'Telegram notification test alert',
      tactics: [],
      findings: [],
      clauses: [],
      deadlines: [],
      safeSteps: ['Verify directly'],
      drafts: [],
      disclaimer: 'Informational analysis only'
    });

    const alerts = await triggerFamilyAlerts(submission, analysis);
    expect(alerts.length).toBe(1);

    const sentChannels = alerts[0].channelsSent.map((c) => c.channel);
    expect(sentChannels).toContain('email');
    expect(sentChannels).toContain('telegram');
  });
});
