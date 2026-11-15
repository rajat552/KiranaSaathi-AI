import { Request, Response, NextFunction } from 'express';
import { supplierService } from './supplier.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class SupplierController {
  async createSupplier(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.createSupplier(req.shopContext!.shopId, req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async listSuppliers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.listSuppliers(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async recordQuote(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.recordQuote(
        req.shopContext!.shopId,
        req.params.supplierId as string,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async compareQuotes(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await supplierService.compareQuotesForProduct(
        req.shopContext!.shopId,
        req.params.productId as string
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const supplierController = new SupplierController();
