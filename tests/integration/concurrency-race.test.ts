import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('High-Concurrency Race Condition & Overselling Defense Suite', () => {
  const app = createApp();
  let token: string;
  let shopId: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDB();

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Race Tester', email: 'racer@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Concurrency Kirana' });
    shopId = shopRes.body.data.shop.id;

    // Create product with opening stock of EXACTLY 1 unit
    const pRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Limited Edition Masala 50g',
        category: 'Spices',
        unit: 'PACK',
        costPrice: 40,
        sellingPrice: 50,
        reorderPoint: 5,
        openingStock: { quantity: 1 } // Only 1 in stock!
      });
    productId = pRes.body.data._id;
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should prevent overselling when 10 simultaneous sales compete for 1 unit in stock', async () => {
    // Fire 10 concurrent requests simultaneously
    const requests = Array.from({ length: 10 }).map(() =>
      request(app)
        .post(`/api/v1/shops/${shopId}/sales`)
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', uuidv4())
        .send({
          items: [{ productId, quantity: 1, unitPrice: 50 }],
          paymentMethod: 'CASH'
        })
    );

    const responses = await Promise.all(requests);

    const successResponses = responses.filter(r => r.status === 201);
    const failureResponses = responses.filter(r => r.status === 422);

    // Exactly 1 must win, exactly 9 must be rejected
    expect(successResponses.length).toBe(1);
    expect(failureResponses.length).toBe(9);

    // Verify final stock is exactly 0 (no negative inventory!)
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);

    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(0);

    // Verify ledger reconciliation
    const reconRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/reconcile`)
      .set('Authorization', `Bearer ${token}`);

    expect(reconRes.status).toBe(200);
    expect(reconRes.body.data.isConsistent).toBe(true);
    expect(reconRes.body.data.discrepancyCount).toBe(0);
  });
});
