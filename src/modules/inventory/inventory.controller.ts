import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class InventoryController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getInventorySummary(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.listMovements(req.shopContext!.shopId, req.query as any);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async setOpeningBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.setOpeningBalance(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body,
        req.idempotencyKey
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async recordReceipt(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.recordReceipt(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body,
        req.idempotencyKey
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async recordAdjustment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.recordAdjustment(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body,
        req.idempotencyKey
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async reconcile(req: Request, res: Response, next: NextFunction) {
    try {
      const repair = req.query.repair === 'true';
      const result = await inventoryService.reconcileBalances(req.shopContext!.shopId, repair);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const inventoryController = new InventoryController();
