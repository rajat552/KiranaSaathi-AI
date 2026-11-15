import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Auth & Multi-Tenant Isolation Security Suite', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  it('should register a new user, issue tokens, and log in successfully', async () => {
    // 1. Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ramesh Gupta',
        email: 'ramesh@kirana.com',
        phone: '9876543210',
        password: 'Password123!'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.name).toBe('Ramesh Gupta');
    expect(regRes.body.data.accessToken).toBeDefined();
    expect(regRes.body.data.refreshToken).toBeDefined();

    // 2. Login
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        identifier: 'ramesh@kirana.com',
        password: 'Password123!'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe('ramesh@kirana.com');

    // 3. Me profile
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.name).toBe('Ramesh Gupta');
  });

  it('should rotate refresh token and reject revoked refresh token reuse', async () => {
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Suresh Kumar',
        email: 'suresh@kirana.com',
        password: 'Password123!'
      });

    const initialRefreshToken = regRes.body.data.refreshToken;

    // Refresh token once
    const refRes1 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refRes1.status).toBe(200);
    expect(refRes1.body.data.accessToken).toBeDefined();
    expect(refRes1.body.data.refreshToken).toBeDefined();

    // Attempting to reuse initialRefreshToken should be rejected (revoked / rotated)
    const refRes2 = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: initialRefreshToken });

    expect(refRes2.status).toBe(401);
    expect(refRes2.body.error.code).toBe('REVOKED_TOKEN');
  });

  it('should strictly enforce tenant isolation: Shop A user CANNOT access Shop B data', async () => {
    // 1. Create User A and Shop A
    const userARes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner A', email: 'ownerA@shop.com', password: 'Password123!' });
    const tokenA = userARes.body.data.accessToken;

    const shopARes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Gupta Kirana Store' });
    const shopAId = shopARes.body.data.shop.id;

    // 2. Create User B and Shop B
    const userBRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner B', email: 'ownerB@shop.com', password: 'Password123!' });
    const tokenB = userBRes.body.data.accessToken;

    const shopBRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ name: 'Sharma Daily Needs' });
    const shopBId = shopBRes.body.data.shop.id;

    // 3. User A attempts to access Shop B details -> MUST RETURN 403 FORBIDDEN
    const crossTenantGet = await request(app)
      .get(`/api/v1/shops/${shopBId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(crossTenantGet.status).toBe(403);
    expect(crossTenantGet.body.error.code).toBe('FORBIDDEN');

    // 4. User B attempts to access Shop A members -> MUST RETURN 403 FORBIDDEN
    const crossTenantMembers = await request(app)
      .get(`/api/v1/shops/${shopAId}/members`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(crossTenantMembers.status).toBe(403);
    expect(crossTenantMembers.body.error.code).toBe('FORBIDDEN');
  });
});
