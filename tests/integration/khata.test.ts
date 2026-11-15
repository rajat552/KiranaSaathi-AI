import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Customer Khata & Liquidity Invariant Suite (PS-08)', () => {
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
      .send({ name: 'Owner', email: 'owner@khata.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gupta General Store' });
    shopId = shopRes.body.data.shop.id;

    // Create a product and sell some for CASH to establish cash baseline
    const prodRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Fortune Sunlite Oil 1L',
        category: 'Edible Oil',
        unit: 'PACK',
        costPrice: 130,
        sellingPrice: 150,
        openingStock: { quantity: 50 }
      });
    productId = prodRes.body.data._id;

    // Record cash sale: ₹1,500
    await request(app)
      .post(`/api/v1/shops/${shopId}/sales`)
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', uuidv4())
      .send({
        items: [{ productId, quantity: 10, unitPrice: 150 }],
        paymentMethod: 'CASH'
      });
  });

  it('should track customer credit ledger, partial collections, and credit limits', async () => {
    // 1. Create Khata customer with ₹2,000 credit limit
    const custRes = await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Ramesh Kumar',
        phoneNumber: '9876543210',
        creditLimit: 2000
      });
    expect(custRes.status).toBe(201);
    const customerId = custRes.body.data._id;
    expect(custRes.body.data.currentBalance).toBe(0);

    // 2. Give credit: ₹1,200
    const credRes = await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers/${customerId}/credit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1200,
        notes: 'Monthly ration groceries on udhaari'
      });
    expect(credRes.status).toBe(200);
    expect(credRes.body.data.currentBalance).toBe(1200);

    // 3. Exceed credit limit: attempting +₹1,000 (total ₹2,200 > limit ₹2,000) must fail
    const overLimitRes = await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers/${customerId}/credit`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 1000,
        notes: 'Excess credit attempt'
      });
    expect(overLimitRes.status).toBe(400);
    expect(overLimitRes.body.error.message).toContain('Credit limit exceeded');

    // 4. Collect partial payment: ₹500 in CASH
    const collectRes = await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers/${customerId}/collect`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 500,
        paymentMode: 'CASH',
        notes: 'Partial settlement via cash'
      });
    expect(collectRes.status).toBe(200);
    expect(collectRes.body.data.currentBalance).toBe(700);
  });

  it('should enforce core liquidity invariant: uncollected khata is excluded from purchasing cash cap', async () => {
    // Create customer and give ₹3,000 credit
    const custRes = await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerName: 'Suresh Sharma',
        creditLimit: 5000
      });
    const customerId = custRes.body.data._id;

    await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers/${customerId}/credit`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 3000, notes: 'Rice & Dal on credit' });

    // Collect ₹1,000 in cash
    await request(app)
      .post(`/api/v1/shops/${shopId}/khata/customers/${customerId}/collect`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 1000, paymentMode: 'CASH' });

    // Now query liquidity context
    // Expected:
    // Cash sales = ₹1,500
    // Khata collected = ₹1,000
    // Available liquid cash = ₹2,500
    // Uncollected khata receivables = ₹2,000
    // Safe replenishment cash cap = ₹2,500 (NOT ₹4,500!)
    const liqRes = await request(app)
      .get(`/api/v1/shops/${shopId}/khata/liquidity-context`)
      .set('Authorization', `Bearer ${token}`);

    expect(liqRes.status).toBe(200);
    const liq = liqRes.body.data;
    expect(liq.estimatedCashSalesTotal).toBe(1500);
    expect(liq.totalCollectedKhata).toBe(1000);
    expect(liq.totalUncollectedReceivables).toBe(2000);
    expect(liq.availableLiquidCash).toBe(2500);
    expect(liq.safeReplenishmentCashCap).toBe(2500);
    expect(liq.liquidityInvariantEnforced).toBe(true);
    expect(liq.safeReplenishmentCashCap).toBeLessThan(
      liq.availableLiquidCash + liq.totalUncollectedReceivables
    );
  });
});
