import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('No-POS Operating Engine Suite (PS-05 & PS-09)', () => {
  const app = createApp();
  let token: string;
  let shopId: string;
  let productId: string;

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
      .send({ name: 'Kirana Owner', email: 'owner@nopos.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shree Krishna Store' });
    shopId = shopRes.body.data.shop.id;

    // Create a product with initial opening stock 20
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Madhur Sugar 1kg',
        category: 'Staples',
        unit: 'PACK',
        costPrice: 42,
        sellingPrice: 48,
        openingStock: { quantity: 20 }
      });
    productId = prodRes.body.data._id;

    // Add colloquial alias
    await request(app)
      .post(`/api/v1/shops/${shopId}/products/${productId}/aliases`)
      .set('Authorization', `Bearer ${token}`)
      .send({ aliasText: 'cheeni packet', language: 'hinglish' });
  });

  it('should perform shelf count snapshot and reconcile variance into the immutable ledger', async () => {
    // Current stock is 20. Count on shelf is actually 15 (-5 shortage/damage)
    const snapRes = await request(app)
      .post(`/api/v1/shops/${shopId}/nopos/snapshots`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        notes: 'Sunday evening physical shelf audit',
        items: [{ productId, countedQty: 15 }]
      });

    expect(snapRes.status).toBe(201);
    expect(snapRes.body.data.status).toBe('applied');
    expect(snapRes.body.data.items[0].expectedQty).toBe(20);
    expect(snapRes.body.data.items[0].varianceQty).toBe(-5);

    // Verify stock balance is now 15
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.status).toBe(200);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item).toBeDefined();
    expect(item.onHandQty).toBe(15);

    // Verify audit adjustment movement in ledger
    const movRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory/movements?productId=${productId}`)
      .set('Authorization', `Bearer ${token}`);
    const auditMovements = movRes.body.data.movements.filter(
      (m: any) => m.movementType === 'manual_adjustment' && m.referenceType === 'audit'
    );
    expect(auditMovements.length).toBe(1);
    expect(auditMovements[0].quantityDelta).toBe(-5);
  });

  it('should record daily depletion observations via text/voice without barcode scanning', async () => {
    // Deplete 5 packets using colloquial alias 'cheeni packet'
    const depRes = await request(app)
      .post(`/api/v1/shops/${shopId}/nopos/depletions`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        rawTranscription: '5 cheeni packet beche',
        source: 'voice',
        items: [{ rawText: 'cheeni packet', quantity: 5 }]
      });

    expect(depRes.status).toBe(201);
    expect(depRes.body.data.totalUnits).toBe(5);
    expect(depRes.body.data.totalEstimatedRevenue).toBe(240); // 5 * 48

    // Verify on-hand stock reduced from 20 to 15
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.status).toBe(200);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(15);
  });

  it('should process invoice ingestion queue, allow human verification, and commit stock to ledger', async () => {
    // Ingest invoice with 2 lines
    const ingRes = await request(app)
      .post(`/api/v1/shops/${shopId}/nopos/invoices`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        invoiceNumber: 'INV-2026-99',
        lines: [
          {
            rawDescription: 'cheeni packet', // matches existing alias
            quantity: 30,
            unitCost: 40,
            batchCode: 'BATCH-SUG-01'
          },
          {
            rawDescription: 'Unmatched Raw Item X',
            quantity: 10,
            unitCost: 15
          }
        ]
      });

    expect(ingRes.status).toBe(201);
    const invoiceId = ingRes.body.data._id;
    expect(ingRes.body.data.status).toBe('PENDING_REVIEW');
    expect(ingRes.body.data.lineItems[0].status).toBe('verified'); // matched automatically
    expect(ingRes.body.data.lineItems[1].status).toBe('pending'); // unmatched

    // Attempting to commit with pending line must fail
    const prematureCommit = await request(app)
      .post(`/api/v1/shops/${shopId}/nopos/invoices/${invoiceId}/commit`)
      .set('Authorization', `Bearer ${token}`);
    expect(prematureCommit.status).toBe(400);

    // Verify or reject the pending second line
    const line2Id = ingRes.body.data.lineItems[1]._id;
    const verifyRes = await request(app)
      .patch(`/api/v1/shops/${shopId}/nopos/invoices/${invoiceId}/lines/${line2Id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        matchedProductId: productId,
        status: 'verified'
      });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.status).toBe('VERIFIED');

    // Now commit invoice
    const commitRes = await request(app)
      .post(`/api/v1/shops/${shopId}/nopos/invoices/${invoiceId}/commit`)
      .set('Authorization', `Bearer ${token}`);
    expect(commitRes.status).toBe(200);
    expect(commitRes.body.data.status).toBe('COMMITTED');

    // Verify stock balance increased: 20 + 30 + 10 = 60
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.status).toBe(200);
    const item = invRes.body.data.find((p: any) => p.productId === productId);
    expect(item.onHandQty).toBe(60);
  });
});
