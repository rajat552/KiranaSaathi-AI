import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Inventory Ledger, Movements & Reconciliation Suite', () => {
  const app = createApp();
  let token: string;
  let shopId: string;

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
      .send({ name: 'Test Shop' });
    shopId = shopRes.body.data.shop.id;
  });

  it('should create product with opening balance and reflect in stock projection and immutable ledger', async () => {
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tata Salt 1kg',
        category: 'Groceries',
        unit: 'PACK',
        costPrice: 20,
        sellingPrice: 28,
        reorderPoint: 15,
        targetCoverDays: 7,
        openingStock: {
          quantity: 50
        }
      });

    expect(prodRes.status).toBe(201);
    const productId = prodRes.body.data._id;

    // Check inventory balance
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);

    expect(invRes.status).toBe(200);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item).toBeDefined();
    expect(item.onHandQty).toBe(50);
    expect(item.isLowStock).toBe(false);

    // Check ledger movements
    const moveRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/movements?productId=${productId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(moveRes.status).toBe(200);
    expect(moveRes.body.data.movements.length).toBe(1);
    expect(moveRes.body.data.movements[0].movementType).toBe('opening_balance');
    expect(moveRes.body.data.movements[0].quantityDelta).toBe(50);
  });

  it('should enforce idempotency on stock receipts and prevent double increment', async () => {
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Maggi 2-Minute Noodles',
        category: 'Instant Food',
        unit: 'PACK',
        costPrice: 12,
        sellingPrice: 14,
        reorderPoint: 20
      });
    const productId = prodRes.body.data._id;

    const idempotencyKey = uuidv4();

    // First receipt: add 30 packs
    const receipt1 = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/receipts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        productId,
        quantity: 30,
        unitCost: 12,
        reason: 'Direct delivery'
      });

    expect(receipt1.status).toBe(201);
    expect(receipt1.body.data.balance.onHandQty).toBe(30);

    // Replay with identical idempotency key -> MUST return cached result and NOT increment stock again
    const receiptReplay = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/receipts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        productId,
        quantity: 30,
        unitCost: 12,
        reason: 'Direct delivery'
      });

    expect(receiptReplay.status).toBe(201);
    expect(receiptReplay.body.data.balance.onHandQty).toBe(30);

    // Verify actual stock balance remains 30, not 60
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);

    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(30);

    // Replay with same key but DIFFERENT payload -> MUST return 409 Conflict
    const receiptConflict = await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/receipts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', idempotencyKey)
      .send({
        productId,
        quantity: 50, // altered quantity
        unitCost: 12
      });

    expect(receiptConflict.status).toBe(409);
    expect(receiptConflict.body.error.code).toBe('IDEMPOTENCY_CONFLICT');
  });

  it('should reconcile stock balances against ledger sum and detect consistency', async () => {
    // 1. Create product
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fortune Sunlite Oil 1L',
        category: 'Oils',
        unit: 'L',
        costPrice: 110,
        sellingPrice: 135
      });
    const productId = prodRes.body.data._id;

    // 2. Receipt 40L
    await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/receipts`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({ productId, quantity: 40, unitCost: 110 });

    // 3. Wastage 2L (damaged bottle)
    await request(app)
      .post(`/api/v1/shops/${shopId}/inventory/adjustments`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        productId,
        adjustmentType: 'wastage',
        quantityDelta: 2,
        reason: 'Punctured bottle during handling'
      });

    // 4. Run reconciliation
    const reconRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/reconcile`)
      .set('Authorization', `Bearer ${token}`);

    expect(reconRes.status).toBe(200);
    expect(reconRes.body.data.isConsistent).toBe(true);
    expect(reconRes.body.data.discrepancyCount).toBe(0);

    // Verify final on-hand is 38
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(38);
  });
});
