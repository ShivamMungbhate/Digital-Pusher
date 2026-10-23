import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Submission } from '../src/models/Submission.js';
import { Analysis } from '../src/models/Analysis.js';
import { processSubmission } from '../src/services/queue.js';
import { env } from '../src/config/env.js';

describe('Submission Pipeline & Zod Validation', () => {
  let app: any;
  let seniorToken: string;
  let seniorId: string;

  beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Register test senior
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Senior Submitter',
        email: 'submitter@example.com',
        password: 'Password123!',
        role: 'senior'
      });
    seniorToken = res.body.tokens.accessToken;
    seniorId = res.body.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Submission.deleteMany({});
    await Analysis.deleteMany({});
    await disconnectDB();
  });

  it('rejects unsupported file types (e.g. .exe)', async () => {
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${seniorToken}`)
      .attach('file', Buffer.from('binary-code'), {
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('accepts text submission and masks PII in database', async () => {
    const rawText = 'Call police officer at +91 9876543210 regarding Aadhaar 1234 5678 9012';
    const res = await request(app)
      .post('/api/submissions')
      .set('Authorization', `Bearer ${seniorToken}`)
      .field('text', rawText)
      .field('mode', 'scam');

    expect(res.status).toBe(201);
    expect(res.body.submissionId).toBeDefined();
    expect(res.body.status).toBe('queued');

    const saved = await Submission.findById(res.body.submissionId);
    expect(saved).toBeDefined();
    expect(saved?.rawTextMasked).not.toContain('9876543210');
    expect(saved?.rawTextMasked).toContain('[PHONE_1]');
    expect(saved?.rawTextMasked).toContain('[AADHAAR_1]');
  });

  it('processes submission through queue worker and creates analysis', async () => {
    // Create submission
    const sub = await Submission.create({
      userId: seniorId,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: 'URGENT: DCP Crime branch. Transfer Rs 50,000 immediately.',
      status: 'queued'
    });

    // Run worker processSubmission (pointing to our live AI service on port 5001)
    await processSubmission(sub._id.toString());

    const updated = await Submission.findById(sub._id);
    expect(updated?.status).toBe('done');

    const analysis = await Analysis.findOne({ submissionId: sub._id });
    expect(analysis).toBeDefined();
    expect(analysis?.verdict).toBe('likely_scam');
    expect(analysis?.risk).toBe('high');
    expect(analysis?.tactics.length).toBeGreaterThan(0);
  }, 60000);

  it('retries and marks submission failed on invalid AI response schema', async () => {
    const sub = await Submission.create({
      userId: seniorId,
      mode: 'scam',
      language: 'en',
      sourceType: 'text',
      rawTextMasked: 'Mock bad response test',
      status: 'queued',
      retryCount: 1 // Next failure hits 2 and sets status to failed
    });

    // Temporarily point to a non-existent or invalid URL to simulate failure
    const originalUrl = env.AI_SERVICE_URL;
    (env as any).AI_SERVICE_URL = 'http://127.0.0.1:59999'; // Non-responsive port

    try {
      await processSubmission(sub._id.toString());
    } catch {
      // Expected error thrown by worker
    } finally {
      (env as any).AI_SERVICE_URL = originalUrl;
    }

    const updated = await Submission.findById(sub._id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error).toContain('unable to analyze this submission');
  });
});
