import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';

describe('Local Product Names & Multi-Alias Resolution Suite (PS-10)', () => {
  const app = createApp();
  let token: string;
  let shopId: string;
  let tataSaltId: string;
  let parleGId: string;

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
      .send({ name: 'Kirana Owner', email: 'kirana@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shree Ganesh Kirana' });
    shopId = shopRes.body.data.shop.id;

    // Create 2 products
    const prod1 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Tata Salt 1kg',
        brand: 'Tata',
        category: 'Groceries',
        unit: 'PACK',
        costPrice: 22,
        sellingPrice: 28,
        openingStock: { quantity: 40 }
      });
    tataSaltId = prod1.body.data._id;

    const prod2 = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Parle-G Glucose Biscuits 250g',
        brand: 'Parle',
        category: 'Biscuits',
        unit: 'PACK',
        costPrice: 20,
        sellingPrice: 25,
        openingStock: { quantity: 100 }
      });
    parleGId = prod2.body.data._id;
  });

  it('should associate local aliases with products and resolve exact and fuzzy colloquial terms', async () => {
    // Add colloquial Hindi/Hinglish aliases
    const aliasRes1 = await request(app)
      .post(`/api/v1/shops/${shopId}/products/${tataSaltId}/aliases`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aliasText: 'tata namak',
        language: 'hinglish'
      });
    expect(aliasRes1.status).toBe(201);
    expect(aliasRes1.body.data.normalizedAlias).toBe('tata namak');

    const aliasRes2 = await request(app)
      .post(`/api/v1/shops/${shopId}/products/${parleGId}/aliases`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aliasText: 'parle ji chhota packet',
        language: 'hinglish'
      });
    expect(aliasRes2.status).toBe(201);

    // Test exact alias resolution
    const resolve1 = await request(app)
      .post(`/api/v1/shops/${shopId}/products/resolve-alias`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'tata namak' });
    expect(resolve1.status).toBe(200);
    expect(resolve1.body.data.resolved).toBe(true);
    expect(resolve1.body.data.productId).toBe(tataSaltId);
    expect(resolve1.body.data.matchType).toBe('exact_alias');
    expect(resolve1.body.data.requiresConfirmation).toBe(false);

    // Test fuzzy colloquial query matching with high similarity
    const resolve2 = await request(app)
      .post(`/api/v1/shops/${shopId}/products/resolve-alias`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'parle ji chhota' });
    expect(resolve2.status).toBe(200);
    expect(resolve2.body.data.resolved).toBe(true);
    expect(resolve2.body.data.productId).toBe(parleGId);
    expect(resolve2.body.data.candidates.length).toBeGreaterThan(0);
  });

  it('should flag ambiguous or low-confidence queries for human confirmation', async () => {
    // Add alias
    await request(app)
      .post(`/api/v1/shops/${shopId}/products/${tataSaltId}/aliases`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aliasText: 'namak packet',
        language: 'hinglish',
        isConfirmed: false,
        confidenceScore: 0.65
      });

    const resolveRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products/resolve-alias`)
      .set('Authorization', `Bearer ${token}`)
      .send({ query: 'namak packet' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.data.resolved).toBe(true);
    expect(resolveRes.body.data.requiresConfirmation).toBe(true);
  });
});
