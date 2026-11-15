import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Hard Owner Cash Budget & Multi-SKU Replenishment Suite (PS-12)', () => {
  const app = createApp();
  let token: string;
  let shopId: string;
  let milkId: string;
  let gheeId: string;

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
      .send({ name: 'Owner', email: 'owner@budget.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shree Balaji Kirana' });
    shopId = shopRes.body.data.shop.id;

    // Fast moving staple: Amul Taaza Milk (Cost: 28, Selling: 32, ReorderPoint: 30, OnHand: 5) -> Urgent
    const p1 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Amul Taaza Milk 500ml',
        category: 'Dairy',
        unit: 'PACK',
        costPrice: 28,
        sellingPrice: 32,
        reorderPoint: 30,
        targetCoverDays: 3,
        openingStock: { quantity: 5 }
      });
    milkId = p1.body.data._id;

    // High cost item: Desi Ghee 1L Tin (Cost: 650, Selling: 750, ReorderPoint: 5, OnHand: 1)
    const p2 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Amul Pure Ghee 1L',
        category: 'Dairy',
        unit: 'PACK',
        costPrice: 650,
        sellingPrice: 750,
        reorderPoint: 5,
        targetCoverDays: 7,
        openingStock: { quantity: 1 }
      });
    gheeId = p2.body.data._id;
  });

  it('should strictly enforce owner cash budget limit and explain trade-offs and deferrals', async () => {
    // Set a tight budget of ₹500
    // Milk needs ~25 units (25 * 28 = 700 unconstrained).
    // Ghee needs 4 units (4 * 650 = 2600 unconstrained).
    // Total unconstrained demand = ₹3,300, which far exceeds ₹500!
    const planRes = await request(app)
      .post(`/api/v1/shops/${shopId}/analytics/budget-replenishment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ budgetLimit: 500 });

    expect(planRes.status).toBe(200);
    const plan = planRes.body.data;

    // Invariant: allocatedAmount <= budgetLimit
    expect(plan.allocatedAmount).toBeLessThanOrEqual(500);
    expect(plan.budgetLimit).toBe(500);
    expect(plan.remainingCashBuffer).toBeGreaterThanOrEqual(0);
    expect(plan.remainingCashBuffer + plan.allocatedAmount).toBe(500);

    // Ghee (cost 650) cannot be bought with 500 budget -> MUST be deferred
    const gheeDeferred = plan.deferredItems.find((d: any) => d.productId === gheeId);
    expect(gheeDeferred).toBeDefined();
    expect(gheeDeferred.deferralReason).toContain('exceeds available cash buffer');

    // Milk should be allocated up to affordability: floor(500 / 28) = 17 units = 476
    const milkAllocated = plan.allocatedItems.find((a: any) => a.productId === milkId);
    expect(milkAllocated).toBeDefined();
    expect(milkAllocated.allocatedQty).toBeLessThanOrEqual(17);
    expect(milkAllocated.lineCost).toBeLessThanOrEqual(500);
  });

  it('should allocate both items when budget is comfortably sufficient', async () => {
    // Budget ₹5,000 is plenty for both Milk and Ghee
    const planRes = await request(app)
      .post(`/api/v1/shops/${shopId}/analytics/budget-replenishment`)
      .set('Authorization', `Bearer ${token}`)
      .send({ budgetLimit: 5000 });

    expect(planRes.status).toBe(200);
    const plan = planRes.body.data;

    expect(plan.allocatedAmount).toBeLessThanOrEqual(5000);
    const milkAllocated = plan.allocatedItems.find((a: any) => a.productId === milkId);
    const gheeAllocated = plan.allocatedItems.find((a: any) => a.productId === gheeId);

    expect(milkAllocated).toBeDefined();
    expect(gheeAllocated).toBeDefined();
    expect(plan.deferredItems.length).toBe(0);
  });
});
