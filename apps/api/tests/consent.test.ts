import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Consent } from '../src/models/Consent.js';

describe('Consent and Family Linking', () => {
  let app: any;
  let seniorToken: string;
  let familyToken: string;
  let inviteCode: string;
  let consentId: string;

  beforeAll(async () => {
    await connectDB();
    app = createApp();

    // Register senior
    const seniorRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Senior Sita',
        email: 'sita@example.com',
        password: 'Password123!',
        role: 'senior'
      });
    seniorToken = seniorRes.body.tokens.accessToken;

    // Register family
    const familyRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Family Ankit',
        email: 'ankit@example.com',
        password: 'Password123!',
        role: 'family'
      });
    familyToken = familyRes.body.tokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Consent.deleteMany({});
    await disconnectDB();
  });

  it('senior generates invite code', async () => {
    const res = await request(app)
      .post('/api/consents/invite-code')
      .set('Authorization', `Bearer ${seniorToken}`)
      .send({
        shareLevel: 'summary',
        alertThreshold: 'medium'
      });

    expect(res.status).toBe(201);
    expect(res.body.consent.inviteCode).toBeDefined();
    inviteCode = res.body.consent.inviteCode;
    consentId = res.body.consent.id;
  });

  it('family member requests link using invite code', async () => {
    const res = await request(app)
      .post('/api/consents/link')
      .set('Authorization', `Bearer ${familyToken}`)
      .send({ inviteCode });

    expect(res.status).toBe(200);
    expect(res.body.consent.status).toBe('pending');
  });

  it('senior accepts the consent request', async () => {
    const res = await request(app)
      .post(`/api/consents/${consentId}/accept`)
      .set('Authorization', `Bearer ${seniorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.consent.status).toBe('active');
    expect(res.body.consent.acceptedAt).toBeDefined();
  });

  it('senior updates consent settings', async () => {
    const res = await request(app)
      .patch(`/api/consents/${consentId}`)
      .set('Authorization', `Bearer ${seniorToken}`)
      .send({
        shareLevel: 'summary_and_media',
        alertThreshold: 'high'
      });

    expect(res.status).toBe(200);
    expect(res.body.consent.shareLevel).toBe('summary_and_media');
    expect(res.body.consent.alertThreshold).toBe('high');
  });

  it('senior revokes consent link', async () => {
    const res = await request(app)
      .post(`/api/consents/${consentId}/revoke`)
      .set('Authorization', `Bearer ${seniorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.consent.status).toBe('revoked');
    expect(res.body.consent.revokedAt).toBeDefined();
  });
});
