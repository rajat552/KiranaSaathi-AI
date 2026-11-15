import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { setupTestDB, teardownTestDB, clearTestDB } from '../helpers/setup.js';
import { v4 as uuidv4 } from 'uuid';

describe('Offline Synchronization & Voice Command Suite', () => {
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
      .send({ name: 'Voice User', email: 'voice@test.com', password: 'Password123!' });
    token = regRes.body.data.accessToken;

    const shopRes = await request(app)
      .post('/api/v1/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Voice Kirana' });
    shopId = shopRes.body.data.shop.id;

    const pRes = await request(app)
      .post(`/api/v1/shops/${shopId}/products`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Aashirvaad Atta 5kg',
        category: 'Flour',
        unit: 'PACK',
        costPrice: 220,
        sellingPrice: 260,
        reorderPoint: 10,
        openingStock: { quantity: 30 }
      });
    productId = pRes.body.data._id;
  });

  it('should process batch offline sync events and handle idempotent replay safely', async () => {
    const clientEventId1 = uuidv4();
    const clientEventId2 = uuidv4();

    // 1. Submit batch with 1 sale event
    const syncRes1 = await request(app)
      .post(`/api/v1/shops/${shopId}/sync/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId: 'pos-terminal-01',
        events: [
          {
            clientEventId: clientEventId1,
            deviceId: 'pos-terminal-01',
            eventType: 'sale',
            clientTimestamp: new Date().toISOString(),
            payload: {
              items: [{ productId, quantity: 5, unitPrice: 260 }],
              paymentMethod: 'CASH'
            }
          }
        ]
      });

    expect(syncRes1.status).toBe(200);
    expect(syncRes1.body.data.acceptedCount).toBe(1);
    expect(syncRes1.body.data.events[0].status).toBe('accepted');

    // Verify stock dropped from 30 to 25
    const invRes = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes.body.data.find((p: any) => p.productId === productId).onHandQty).toBe(25);

    // 2. Replay the same batch again -> MUST report duplicate and NOT re-decrement stock!
    const syncRes2 = await request(app)
      .post(`/api/v1/shops/${shopId}/sync/batch`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        deviceId: 'pos-terminal-01',
        events: [
          {
            clientEventId: clientEventId1,
            deviceId: 'pos-terminal-01',
            eventType: 'sale',
            clientTimestamp: new Date().toISOString(),
            payload: {
              items: [{ productId, quantity: 5, unitPrice: 260 }],
              paymentMethod: 'CASH'
            }
          }
        ]
      });

    expect(syncRes2.status).toBe(200);
    expect(syncRes2.body.data.duplicateCount).toBe(1);
    expect(syncRes2.body.data.events[0].status).toBe('duplicate');

    // Verify stock remains 25
    const invRes2 = await request(app)
      .get(`/api/v1/shops/${shopId}/inventory`)
      .set('Authorization', `Bearer ${token}`);
    expect(invRes2.body.data.find((p: any) => p.productId === productId).onHandQty).toBe(25);
  });

  it('should parse voice utterance into structured intent and require confirmation for mutating actions', async () => {
    const voiceRes = await request(app)
      .post(`/api/v1/shops/${shopId}/voice/command`)
      .set('Authorization', `Bearer ${token}`)
      .send({ transcript: 'Becha 3 packet Aashirvaad Atta' });

    expect(voiceRes.status).toBe(200);
    expect(voiceRes.body.data.intent).toBe('RECORD_SALE');
    expect(voiceRes.body.data.extractedData.productName).toBe('Aashirvaad Atta 5kg');
    expect(voiceRes.body.data.extractedData.quantity).toBe(3);
    expect(voiceRes.body.data.requiresConfirmation).toBe(true);
    expect(voiceRes.body.data.confirmationMessage).toContain('Confirm recording sale: 3 PACK of "Aashirvaad Atta 5kg"');
  });
});
