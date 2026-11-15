import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { IdempotencyRecord } from '../models/idempotency.model.js';
import { computeSha256 } from '../utils/crypto.js';
import { AppError } from '../errors/app-error.js';
import { logger } from '../../config/logger.js';

export function idempotencyMiddleware(required = false) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'] as string | undefined;

    if (!key) {
      if (required) {
        next(AppError.badRequest('Idempotency-Key header is required for this operation', [], 'MISSING_IDEMPOTENCY_KEY'));
        return;
      }
      next();
      return;
    }

    const shopId = req.shopContext?.shopId;
    if (!shopId) {
      // Must have resolved tenant before applying shop-scoped idempotency
      next();
      return;
    }

    req.idempotencyKey = key;
    const requestHash = computeSha256(JSON.stringify(req.body || {}));

    try {
      const existing = await IdempotencyRecord.findOne({
        shopId: new mongoose.Types.ObjectId(shopId),
        key
      });

      if (existing) {
        if (existing.status === 'completed') {
          if (existing.requestHash !== requestHash) {
            next(AppError.idempotencyConflict('Idempotency key was previously used with a different request payload'));
            return;
          }
          logger.info(`Returning cached response for idempotency key ${key}`, { shopId, key });
          res.status(existing.statusCode || 200).json(existing.responseBody);
          return;
        }

        if (existing.status === 'processing') {
          next(AppError.conflict('A request with this idempotency key is currently processing. Please retry in a few seconds.'));
          return;
        }
      }

      // Create new processing lock (expires in 24 hours)
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const record = new IdempotencyRecord({
        shopId: new mongoose.Types.ObjectId(shopId),
        key,
        requestHash,
        status: 'processing',
        expiresAt
      });
      await record.save();

      // Intercept res.json to cache response upon success
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          IdempotencyRecord.updateOne(
            { _id: record._id },
            {
              status: 'completed',
              statusCode: res.statusCode,
              responseBody: body
            }
          ).catch(err => logger.error('Failed to update idempotency record to completed', err));
        } else {
          IdempotencyRecord.deleteOne({ _id: record._id }).catch(err =>
            logger.error('Failed to clear failed idempotency record', err)
          );
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
