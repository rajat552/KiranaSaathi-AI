import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Controlled Agentic AI Tool Orchestration Suite', () => {
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
      .send({ name: 'Agent Tester', email: 'agent@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Smart Kirana' });
    shopId = shopRes.body.data.shop.id;

    // Add 1 low-stock product
    await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tata Tea Gold 250g',
        category: 'Beverages',
        unit: 'PACK',
        costPrice: 130,
        sellingPrice: 150,
        reorderPoint: 15,
        openingStock: { quantity: 4 } // 4 <= 15 -> Low stock!
      });
  });

  it('should process agent query, invoke allowlisted tool, and record audit trace', async () => {
    const chatRes = await request(app)
      .post(`/api/v1/shops/${shopId}/agent/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'Which products are low on stock?' });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.success).toBe(true);
    expect(chatRes.body.data.response).toContain('Tata Tea Gold 250g');
    expect(chatRes.body.data.toolCalls.length).toBeGreaterThan(0);
    expect(chatRes.body.data.toolCalls[0].toolName).toBe('get_low_stock_items');
    expect(chatRes.body.data.toolCalls[0].status).toBe('success');

    // Verify persisted run history
    const runsRes = await request(app)
      .get(`/api/v1/shops/${shopId}/agent/runs`)
      .set('Authorization', `Bearer ${token}`);

    expect(runsRes.status).toBe(200);
    expect(runsRes.body.data.length).toBe(1);
    expect(runsRes.body.data[0].prompt).toBe('Which products are low on stock?');
    expect(runsRes.body.data[0].status).toBe('completed');
  });

  it('should route dead stock, budget allocation, and khata inquiries to specialized domain tools', async () => {
    // 1. Inquire about dead stock
    const deadRes = await request(app)
      .post(`/api/v1/shops/${shopId}/agent/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'Show me my dead stock and ageing inventory' });

    expect(deadRes.status).toBe(200);
    expect(deadRes.body.data.toolCalls[0].toolName).toBe('get_dead_stock_summary');

    // 2. Inquire about budget replenishment
    const budgetRes = await request(app)
      .post(`/api/v1/shops/${shopId}/agent/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'Create replenishment allocation under cash budget of 3000' });

    expect(budgetRes.status).toBe(200);
    expect(budgetRes.body.data.toolCalls[0].toolName).toBe('get_cash_budget_plan');
    expect(budgetRes.body.data.toolCalls[0].parameters.budgetLimit).toBe(3000);

    // 3. Inquire about khata liquidity
    const khataRes = await request(app)
      .post(`/api/v1/shops/${shopId}/agent/chat`)
      .set('Authorization', `Bearer ${token}`)
      .send({ prompt: 'What is my current customer khata and liquidity status?' });

    expect(khataRes.status).toBe(200);
    expect(khataRes.body.data.toolCalls[0].toolName).toBe('get_khata_summary');
  });
});
