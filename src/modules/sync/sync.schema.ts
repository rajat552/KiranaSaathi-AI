import { z } from 'zod';

export const syncEventItemSchema = z.object({
  clientEventId: z.string().uuid('clientEventId must be a valid UUID'),
  deviceId: z.string().min(1, 'deviceId is required'),
  eventType: z.enum(['sale', 'stock_receipt', 'adjustment']),
  clientTimestamp: z.string().datetime(),
  payload: z.record(z.any())
});

export const batchSyncSchema = z.object({
  deviceId: z.string().min(1),
  events: z.array(syncEventItemSchema).min(1, 'At least one event required in sync batch')
});

export type SyncEventItem = z.infer<typeof syncEventItemSchema>;
export type BatchSyncInput = z.infer<typeof batchSyncSchema>;
