import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Festival Demand Scenario Planner Suite (PS-04)', () => {
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
      .send({ name: 'Owner', email: 'owner@festival.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Laxmi Kirana Store' });
    shopId = shopRes.body.data.shop.id;

    // Create festive products (Sweets/Dairy/Oil)
    await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Haldiram Soan Papdi 500g',
        category: 'Sweets',
        unit: 'PACK',
        costPrice: 120,
        sellingPrice: 160,
        reorderPoint: 10,
        openingStock: { quantity: 5 }
      });

    await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Amul Pure Ghee 1L',
        category: 'Dairy',
        unit: 'PACK',
        costPrice: 600,
        sellingPrice: 700,
        reorderPoint: 5,
        openingStock: { quantity: 2 }
      });
  });

  it('should generate Conservative, Moderate, and Aggressive festival scenarios with transparent multipliers', async () => {
    const res = await request(app)
      .get(`/api/v1/shops/${shopId}/analytics/festival-scenarios?festivalId=diwali`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const data = res.body.data;

    expect(data.festival.name).toContain('Diwali');
    expect(data.scenarios).toBeDefined();

    // Check conservative scenario (+25%)
    expect(data.scenarios.conservative.scenarioName).toBe('CONSERVATIVE');
    expect(data.scenarios.conservative.multiplier).toBe(1.25);
    expect(data.scenarios.conservative.assumptions).toContain('+25%');
    expect(data.scenarios.conservative.items.length).toBeGreaterThanOrEqual(2);

    // Check moderate scenario (+60%)
    expect(data.scenarios.moderate.scenarioName).toBe('MODERATE');
    expect(data.scenarios.moderate.multiplier).toBe(1.6);

    // Check aggressive scenario (+120%)
    expect(data.scenarios.aggressive.scenarioName).toBe('AGGRESSIVE');
    expect(data.scenarios.aggressive.multiplier).toBe(2.2);

    // Incremental capital required must scale with scenario aggressiveness
    expect(data.scenarios.aggressive.totalIncrementalCapital).toBeGreaterThan(
      data.scenarios.conservative.totalIncrementalCapital
    );

    // Verify data sufficiency indicator
    expect(['HIGH_HISTORY', 'MODERATE_HISTORY', 'PRIOR_ESTIMATES']).toContain(
      data.dataSufficiencyIndicator
    );
  });
});
