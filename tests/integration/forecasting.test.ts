import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Deterministic Forecasting & Replenishment Analytics Suite', () => {
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
      .send({ name: 'Owner', email: 'owner@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Kirana Analytics' });
    shopId = shopRes.body.data.shop.id;

    // Create product: Parle-G with opening stock 100, reorder point 20
    const pRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Parle-G 100g',
        category: 'Biscuits',
        unit: 'PACK',
        costPrice: 8,
        sellingPrice: 10,
        reorderPoint: 20,
        targetCoverDays: 7,
        openingStock: { quantity: 100 }
      });
    productId = pRes.body.data._id;
  });

  it('should compute explainable reorder recommendations with data quality indicators', async () => {
    // 1. Record 2 sales over different days or batches
    await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        items: [{ productId, quantity: 40, unitPrice: 10 }],
        paymentMethod: 'CASH'
      });

    await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        items: [{ productId, quantity: 45, unitPrice: 10 }],
        paymentMethod: 'CASH'
      });

    // Total sold: 85. Remaining: 15 (which is <= reorderPoint 20, so needsReorder must be true!)
    const recRes = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/reorder-recommendations?windowDays=14`)
      .set('Authorization', `Bearer ${token}`);

    expect(recRes.status).toBe(200);
    expect(recRes.body.data.length).toBe(1);

    const rec = recRes.body.data[0];
    expect(rec.productId).toBe(productId);
    expect(rec.currentStock).toBe(15);
    expect(rec.needsReorder).toBe(true);
    expect(rec.averageDailyDemand).toBeGreaterThan(0);
    expect(rec.suggestedReorderQty).toBeGreaterThan(0);
    expect(rec.explanation).toContain('Based on observed sales velocity');
    expect(rec.dataQuality).toBeDefined();
    expect(rec.confidenceScore).toBeGreaterThan(0);
  });

  it('should handle zero-sales products gracefully with LOW_DATA indicator', async () => {
    // Create new product with 0 sales
    const p2Res = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Detergent Bar 200g',
        category: 'Cleaning',
        unit: 'PCS',
        costPrice: 15,
        sellingPrice: 20,
        reorderPoint: 10,
        openingStock: { quantity: 5 } // 5 <= 10, so needs reorder
      });
    const p2Id = p2Res.body.data._id;

    const forecastRes = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/forecast/${p2Id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(forecastRes.status).toBe(200);
    expect(forecastRes.body.data.dataQuality).toBe('LOW_DATA');
    expect(forecastRes.body.data.averageDailyDemand).toBe(0);
    expect(forecastRes.body.data.needsReorder).toBe(true);
    expect(forecastRes.body.data.explanation).toContain('Limited sales history observed');
  });

  it('should detect near-expiry batches and calculate tied capital', async () => {
    // Create expiry-tracked product with batch expiring in 10 days
    const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    const breadRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Whole Wheat Bread 400g',
        category: 'Bakery',
        unit: 'PACK',
        costPrice: 30,
        sellingPrice: 40,
        expiryTracked: true,
        openingStock: {
          quantity: 25,
          batchCode: 'BREAD-BATCH-01',
          expiryDate
        }
      });

    const expRes = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/expiry-risks?horizonDays=30`)
      .set('Authorization', `Bearer ${token}`);

    expect(expRes.status).toBe(200);
    expect(expRes.body.data.length).toBeGreaterThan(0);
    const risk = expRes.body.data[0];
    expect(risk.batchCode).toBe('BREAD-BATCH-01');
    expect(risk.remainingQty).toBe(25);
    expect(risk.tiedCapital).toBe(25 * 30); // 750
    expect(risk.daysUntilExpiry).toBeLessThanOrEqual(10);
  });

  it('should categorize inventory into landed-cost ageing brackets and identify dead stock (PS-01)', async () => {
    // Parle-G was created with 100 units at cost 8 (total locked: 800)
    const deadRes = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/dead-stock-analysis`)
      .set('Authorization', `Bearer ${token}`);

    expect(deadRes.status).toBe(200);
    expect(deadRes.body.data.summary).toBeDefined();
    expect(deadRes.body.data.summary.totalLockedCapital).toBe(800);
    expect(deadRes.body.data.items.length).toBeGreaterThan(0);
    const item = deadRes.body.data.items[0];
    expect(item.productName).toBe('Parle-G 100g');
    expect(item.tiedCapital).toBe(800);
    expect(['0-30', '31-60', '61-90', '90+']).toContain(item.ageingBucket);
    expect(item.actionRecommendation).toBeDefined();
  });
});
