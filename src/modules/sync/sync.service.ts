import mongoose from 'mongoose';
import { SyncEventRecord, SyncStatus } from './sync.model.js';
import { BatchSyncInput, SyncEventItem } from './sync.schema.js';
import { saleService } from '../sales/sale.service.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AppError } from '../../common/errors/app-error.js';

export class SyncService {
  async processBatchSync(shopId: string, actorId: string, input: BatchSyncInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const results: {
      clientEventId: string;
      eventType: string;
      status: SyncStatus;
      message?: string;
      data?: any;
    }[] = [];

    for (const event of input.events) {
      // 1. Check for duplicate replay
      const existing = await SyncEventRecord.findOne({
        shopId: shopObjectId,
        clientEventId: event.clientEventId
      });

      if (existing) {
        results.push({
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          status: 'duplicate',
          message: 'Event was already successfully processed or rejected in a previous sync'
        });
        continue;
      }

      // 2. Process domain event safely
      try {
        let domainResult: any;

        if (event.eventType === 'sale') {
          domainResult = await saleService.recordSale(
            shopId,
            actorId,
            {
              items: event.payload.items,
              paymentMethod: event.payload.paymentMethod || 'CASH',
              source: 'SYNC'
            },
            event.clientEventId
          );
        } else if (event.eventType === 'stock_receipt') {
          domainResult = await inventoryService.recordReceipt(
            shopId,
            actorId,
            event.payload as any,
            event.clientEventId
          );
        } else if (event.eventType === 'adjustment') {
          domainResult = await inventoryService.recordAdjustment(
            shopId,
            actorId,
            event.payload as any,
            event.clientEventId
          );
        }

        const syncRecord = new SyncEventRecord({
          shopId: shopObjectId,
          deviceId: event.deviceId,
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          payload: event.payload,
          status: 'accepted',
          clientTimestamp: new Date(event.clientTimestamp)
        });
        await syncRecord.save();

        results.push({
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          status: 'accepted',
          data: domainResult
        });
      } catch (err: any) {
        const isConflict = err instanceof AppError && err.code === 'INSUFFICIENT_STOCK';
        const status: SyncStatus = isConflict ? 'conflict' : 'rejected';

        const syncRecord = new SyncEventRecord({
          shopId: shopObjectId,
          deviceId: event.deviceId,
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          payload: event.payload,
          status,
          rejectionReason: err.message,
          clientTimestamp: new Date(event.clientTimestamp)
        });
        await syncRecord.save();

        results.push({
          clientEventId: event.clientEventId,
          eventType: event.eventType,
          status,
          message: err.message
        });
      }
    }

    const acceptedCount = results.filter(r => r.status === 'accepted').length;
    const duplicateCount = results.filter(r => r.status === 'duplicate').length;
    const rejectedCount = results.filter(r => r.status === 'rejected' || r.status === 'conflict').length;

    return {
      totalProcessed: results.length,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      events: results
    };
  }
}

export const syncService = new SyncService();
