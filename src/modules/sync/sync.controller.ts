import { Request, Response, NextFunction } from 'express';
import { syncService } from './sync.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class SyncController {
  async batchSync(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await syncService.processBatchSync(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const syncController = new SyncController();
