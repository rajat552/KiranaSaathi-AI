import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Mandatory End-to-End KiranaSaathi Workflow Suite', () => {
  const app = createApp();

  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('should successfully execute the complete 12-step KiranaSaathi business lifecycle', async () => {
    // Step 1: Register a shop owner and shop
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Murugan Pillai',
        email: 'murugan@kiranasaathi.in',
        phone: '9840123456',
        password: 'SecurePassword2026!'
      });
    expect(userRes.status).toBe(201);
    const token = userRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Murugan Provision Store',
        address: '12 Bazaar Road, Madurai',
        timezone: 'Asia/Kolkata',
        defaultCurrency: 'INR'
      });
    expect(shopRes.status).toBe(201);
    const shopId = shopRes.body.data.shop.id;

    // Step 2 & 3: Create a product and record opening stock
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Bru Instant Coffee 100g',
        brand: 'Bru',
        category: 'Beverages',
        unit: 'PACK',
        costPrice: 95,
        sellingPrice: 115,
        reorderPoint: 25,
        targetCoverDays: 7,
        openingStock: {
          quantity: 30
        }
      });
    expect(prodRes.status).toBe(201);
    const productId = prodRes.body.data._id;

    // Step 4: Record a sale (selling 12 packs)
    const saleRes = await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        items: [{ productId, quantity: 12, unitPrice: 115 }],
        paymentMethod: 'UPI'
      });
    expect(saleRes.status).toBe(201);
    expect(saleRes.body.data.sale.totalAmount).toBe(12 * 115);

    // Step 5: Confirm stock changes exactly once (30 - 12 = 18 packs remaining)
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.status).toBe(200);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(18);
    expect(item.isLowStock).toBe(true); // 18 <= reorderPoint 25

    // Step 6: Generate a replenishment recommendation
    const recRes = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/reorder-recommendations?windowDays=14`)
      .set('Authorization', `Bearer ${token}`);
    expect(recRes.status).toBe(200);
    const rec = recRes.body.data.find((r: any) => r.productId === productId);
    expect(rec).toBeDefined();
    expect(rec.needsReorder).toBe(true);
    expect(rec.suggestedReorderQty).toBeGreaterThan(0);

    // Step 7: Ask the AI agent to explain it
    const agentRes = await request(app)
      .post(`/api/v1/shops/${shopId}/agent/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'What items need reordering and why?' });
    expect(agentRes.status).toBe(200);
    expect(agentRes.body.data.response).toContain('Bru Instant Coffee 100g');
    expect(agentRes.body.data.toolCalls.some((t: any) => t.toolName === 'calculate_reorder')).toBe(true);

    // Step 8: Generate a purchase-order draft
    // Register supplier first
    const supRes = await request(app)
      .post(`/api/v1/shops/${shopId}/suppliers`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Hindustan Unilever Distributor', leadTimeDays: 2 });
    expect(supRes.status).toBe(201);
    const supplierId = supRes.body.data._id;

    const poRes = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        supplierId,
        items: [{ productId, requestedQty: rec.suggestedReorderQty, unitPrice: 95 }]
      });
    expect(poRes.status).toBe(201);
    const poId = poRes.body.data._id;
    expect(poRes.body.data.status).toBe('DRAFT');

    // Step 9: Approve the draft using an authorised account
    const approveRes = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders/${poId}/approve`)
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Step 10: Record received goods
    const recvRes = await request(app)
      .post(`/api/v1/shops/${shopId}/purchase-orders/${poId}/receive`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        receivedItems: [{ productId, quantityReceived: rec.suggestedReorderQty }]
      });
    expect(recvRes.status).toBe(200);
    expect(recvRes.body.data.status).toBe('RECEIVED');

    // Step 11: Confirm the updated stock balance (18 + suggestedReorderQty)
    const finalInvRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    const finalItem = finalInvRes.body.data.find((p: any) => p.productId === productId);
    expect(finalItem.onHandQty).toBe(18 + rec.suggestedReorderQty);

    // Step 12: Verify the complete audit history via reconciliation & movements
    const reconRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/reconcile`)
      .set('Authorization', `Bearer ${token}`);
    expect(reconRes.status).toBe(200);
    expect(reconRes.body.data.isConsistent).toBe(true);

    const movesRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/movements?productId=${productId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(movesRes.status).toBe(200);
    // Movements must have: opening_balance (+30), sale (-12), purchase_receipt (+suggestedQty)
    const types = movesRes.body.data.movements.map((m: any) => m.movementType);
    expect(types).toContain('opening_balance');
    expect(types).toContain('sale');
    expect(types).toContain('purchase_receipt');
  });
});
