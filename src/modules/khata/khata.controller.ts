import { Request, Response, NextFunction } from 'express';
import { khataService } from './khata.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class KhataController {
  async createCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.createCustomer(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.getCustomers(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getCustomer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.getCustomer(
        req.shopContext!.shopId,
        req.params.customerId as string
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async recordCredit(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.recordCredit(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.customerId as string,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async recordCollection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.recordCollection(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.customerId as string,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getLiquidityContext(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await khataService.getLiquidityContext(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const khataController = new KhataController();
