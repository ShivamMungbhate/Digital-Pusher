import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';

describe('Auth Endpoints', () => {
  let app: any;

  beforeAll(async () => {
    await connectDB();
    app = createApp();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await disconnectDB();
  });

  it('registers a new senior user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Senior Ramesh',
        email: 'ramesh@example.com',
        password: 'Password123!',
        role: 'senior',
        phone: '+919876543210'
      });

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('senior');
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Ramesh',
        email: 'ramesh@example.com',
        password: 'Password123!',
        role: 'senior'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('USER_EXISTS');
  });

  it('logs in the user with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ramesh@example.com',
        password: 'Password123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it('rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ramesh@example.com',
        password: 'WrongPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns current user with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ramesh@example.com',
        password: 'Password123!'
      });

    const token = loginRes.body.tokens.accessToken;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('ramesh@example.com');
  });
});
