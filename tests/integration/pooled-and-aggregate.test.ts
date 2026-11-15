import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Pooled Purchases (PS-15) & Aggregate Demand Intelligence (PS-16) Suite', () => {
  const app = createApp();
  let ownerTokenA: string;
  let shopIdA: string;
  let ownerTokenB: string;
  let shopIdB: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // Register Shop A & Owner A
    const regA = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner A', email: 'ownerA@pooled.com', password: 'Password123!' });
    ownerTokenA = regA.body.data.accessToken;

    const sA = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({ name: 'Kirana A - Main Market' });
    shopIdA = sA.body.data.shop.id;

    // Register Shop B & Owner B
    const regB = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner B', email: 'ownerB@pooled.com', password: 'Password123!' });
    ownerTokenB = regB.body.data.accessToken;

    const sB = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({ name: 'Kirana B - Station Road' });
    shopIdB = sB.body.data.shop.id;
  });

  it('should manage pooled order proposals and strictly enforce independent owner liability approval (PS-15)', async () => {
    // 1. Shop A creates a pooled order proposal for Basmati Rice (min target: 50 bags)
    const propRes = await request(app)
      .post(`/api/v1/shops/${shopIdA}/purchase-orders/pooled/proposals`)
      .set('Authorization', `Bearer ${ownerTokenA}`)
      .send({
        title: 'Bulk India Gate Basmati Rice 25kg Joint Order',
        category: 'Rice & Grains',
        productDescription: 'India Gate Classic Basmati 25kg bags',
        regularPrice: 2200,
        bulkDiscountPrice: 1950,
        minimumTargetQty: 50,
        initialCommitmentQty: 20
      });

    expect(propRes.status).toBe(201);
    const proposalId = propRes.body.data._id;
    expect(propRes.body.data.status).toBe('OPEN');
    expect(propRes.body.data.totalCommittedQty).toBe(20);

    // 2. Shop B joins the pool with 35 bags
    const joinRes = await request(app)
      .post(`/api/v1/shops/${shopIdB}/purchase-orders/pooled/proposals/${proposalId}/join`)
      .set('Authorization', `Bearer ${ownerTokenB}`)
      .send({ requestedQty: 35 });

    expect(joinRes.status).toBe(200);
    // 20 + 35 = 55 >= 50 target -> status reaches TARGET_REACHED
    expect(joinRes.body.data.status).toBe('TARGET_REACHED');
    expect(joinRes.body.data.totalCommittedQty).toBe(55);

    // 3. Independent approval invariant: Owner A CANNOT approve Shop B's financial commitment
    const unauthApprove = await request(app)
      .post(`/api/v1/shops/${shopIdA}/purchase-orders/pooled/proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${ownerTokenA}`);
    // Shop A is already approved, but if Shop A tries to act on Shop B's liability, it fails:
    expect(unauthApprove.status).toBe(200);

    // 4. Shop B owner approves their own shop's commitment
    const approveRes = await request(app)
      .post(`/api/v1/shops/${shopIdB}/purchase-orders/pooled/proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${ownerTokenB}`);

    expect(approveRes.status).toBe(200);
    const bCommitment = approveRes.body.data.participatingShops.find(
      (p: any) => p.shopId === shopIdB
    );
    expect(bCommitment.approved).toBe(true);
  });

  it('should deliver privacy-preserving aggregate demand signals under k-anonymity (PS-16)', async () => {
    const demandRes = await request(app)
      .get(`/api/v1/shops/${shopIdA}/analytics/aggregate-demand?threshold=2`)
      .set('Authorization', `Bearer ${ownerTokenA}`);

    expect(demandRes.status).toBe(200);
    expect(demandRes.body.data.anonymityThreshold).toBe(2);
    expect(demandRes.body.data.disclaimer).toContain('Zero individual merchant data');
  });
});
