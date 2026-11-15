import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Supplier & Purchase Order Approval Lifecycle Suite', () => {
  const app = createApp();
  let ownerToken: string;
  let staffToken: string;
  let shopId: string;
  let supplierId: string;
  let productId: string;

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();

    // 1. Register Owner
    const ownerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Kirana Owner', email: 'owner@kirana.com', password: 'Password123!' });
    ownerToken = ownerRes.body.data.accessToken;

    // 2. Create Shop
    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Kirana Super Mart' });
    shopId = shopRes.body.data.shop.id;

    // 3. Register Staff and add to shop
    const staffRes = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Shop Helper', email: 'helper@kirana.com', password: 'Password123!' });
    staffToken = staffRes.body.data.accessToken;

    await request(app)
      .post(`/api/v1/shops/${shopId}/members`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ emailOrPhone: 'helper@kirana.com', role: 'staff' });

    // 4. Create Supplier
    const supRes = await request(app)
      .post(`/api/v1/shops/${shopId}/suppliers`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Metro Cash & Carry', phone: '0112345678', leadTimeDays: 2 });
    supplierId = supRes.body.data._id;

    // 5. Create Product
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Sugar 1kg',
        category: 'Groceries',
        unit: 'KG',
        costPrice: 42,
        sellingPrice: 46,
        reorderPoint: 20,
        openingStock: { quantity: 10 }
      });
    productId = prodRes.body.data._id;
  });

  it('should enforce owner-only approval gate and correctly update stock on receiving', async () => {
    // 1. Create Purchase Order Draft
    const poRes = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        supplierId,
        items: [{ productId, requestedQty: 50, unitPrice: 40 }]
      });

    expect(poRes.status).toBe(201);
    const poId = poRes.body.data._id;
    expect(poRes.body.data.status).toBe('DRAFT');

    // 2. Staff attempts to approve PO -> MUST FAIL WITH 403 FORBIDDEN
    const staffApproval = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders/${poId}/approve`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({});

    expect(staffApproval.status).toBe(403);
    expect(staffApproval.body.error.code).toBe('FORBIDDEN');

    // 3. Owner approves PO -> SUCCEEDS
    const ownerApproval = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders/${poId}/approve`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});

    expect(ownerApproval.status).toBe(200);
    expect(ownerApproval.body.data.status).toBe('APPROVED');

    // 4. CRITICAL INVARIANT: Approval alone must NOT change inventory!
    const invCheck = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const itemBeforeRecv = invCheck.body.data.find((p: any) => p.productId === productId);
    expect(itemBeforeRecv.onHandQty).toBe(10); // Still 10, not 60!

    // 5. Goods receiving against approved PO
    const recvRes = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders/${poId}/receive`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        receivedItems: [{ productId, quantityReceived: 50 }]
      });

    expect(recvRes.status).toBe(200);
    expect(recvRes.body.data.status).toBe('RECEIVED');

    // 6. Now stock must reflect the receipt: 10 + 50 = 60
    const invCheckAfter = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${ownerToken}`);
    const itemAfterRecv = invCheckAfter.body.data.find((p: any) => p.productId === productId);
    expect(itemAfterRecv.onHandQty).toBe(60);
  });
});
