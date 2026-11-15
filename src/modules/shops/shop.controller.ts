import { Request, Response, NextFunction } from 'express';
import { shopService } from './shop.service.js';
import { activationService } from './activation.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class ShopController {
  async createShop(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shopService.createShop(req.user!.userId, req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getShop(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shopService.getShop(req.params.shopId as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shopService.listMembers(req.params.shopId as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async addMember(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await shopService.addMember(req.params.shopId as string, req.body);
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getActivationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await activationService.getShopActivationStatus(req.params.shopId as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const shopController = new ShopController();
