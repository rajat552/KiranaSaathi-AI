import { Request, Response, NextFunction } from 'express';
import { saleService } from './sale.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class SaleController {
  async recordSale(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await saleService.recordSale(
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

  async listSales(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await saleService.listSales(req.shopContext!.shopId, req.query as any);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const saleController = new SaleController();
