import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Sales & POS Workflows Suite', () => {
  const app = createApp();
  let token: string;
  let shopId: string;
  let prod1Id: string;
  let prod2Id: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Owner', email: 'owner@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kirana Point' });
    shopId = shopRes.body.data.shop.id;

    // Create 2 products with opening stocks
    const p1 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Parle-G 100g',
        category: 'Biscuits',
        unit: 'PACK',
        costPrice: 8,
        sellingPrice: 10,
        reorderPoint: 10,
        openingStock: { quantity: 20 }
      });
    prod1Id = p1.body.data._id;

    const p2 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Amul Butter 100g',
        category: 'Dairy',
        unit: 'PACK',
        costPrice: 48,
        sellingPrice: 56,
        reorderPoint: 5,
        openingStock: { quantity: 10 }
      });
    prod2Id = p2.body.data._id;
  });

  it('should atomically record a multi-item sale and decrement stock balances exactly once', async () => {
    const idempotencyKey = uuidv4();

    const saleRes = await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [
          { productId: prod1Id, quantity: 5, unitPrice: 10 },
          { productId: prod2Id, quantity: 2, unitPrice: 56 }
        ],
        paymentMethod: 'UPI'
      });

    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.sale.totalAmount).toBe(5 * 10 + 2 * 56); // 50 + 112 = 162
    expect(saleRes.body.data.sale.itemsCount).toBe(2);

    // Verify stock deductions
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);

    const item1 = invRes.body.data.find((p: any) => p.productId === prod1Id);
    const item2 = invRes.body.data.find((p: any) => p.productId === prod2Id);

    expect(item1.onHandQty).toBe(15); // 20 - 5
    expect(item2.onHandQty).toBe(8); // 10 - 2

    // Replay with identical idempotency key -> MUST return cached sale without deducting stock again
    const replayRes = await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        items: [
          { productId: prod1Id, quantity: 5, unitPrice: 10 },
          { productId: prod2Id, quantity: 2, unitPrice: 56 }
        ],
        paymentMethod: 'UPI'
      });

    expect(replayRes.status).toBe(201);
    expect(replayRes.body.data.sale.invoiceNumber).toBe(saleRes.body.data.sale.invoiceNumber);

    // Verify stock remains 15 and 8
    const invRes2 = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes2.body.data.find((p: any) => p.productId === prod1Id).onHandQty).toBe(15);
  });

  it('should reject a sale if requested quantity exceeds available stock and make NO partial deductions', async () => {
    const saleRes = await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        items: [
          { productId: prod1Id, quantity: 5, unitPrice: 10 },
          { productId: prod2Id, quantity: 50, unitPrice: 56 } // Only 10 available!
        ],
        paymentMethod: 'CASH'
      });

    expect(saleRes.status).toBe(422);
    expect(saleRes.body.error.code).toBe('INSUFFICIENT_STOCK');

    // Confirm prod1 was NOT deducted (all-or-nothing invariant)
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.body.data.find((p: any) => p.productId === prod1Id).onHandQty).toBe(20);
    expect(invRes.body.data.find((p: any) => p.productId === prod2Id).onHandQty).toBe(10);
  });
});
