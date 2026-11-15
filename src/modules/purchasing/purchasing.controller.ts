import { Request, Response, NextFunction } from 'express';
import { purchasingService } from './purchasing.service.js';
import { pooledPurchaseService } from './pooled-purchase.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class PurchasingController {
  async createDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchasingService.createDraft(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getPO(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchasingService.getPO(req.shopContext!.shopId, req.params.id as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async listPOs(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as any;
      const result = await purchasingService.listPOs(req.shopContext!.shopId, status);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async approvePO(req: Request, res: Response, next: NextFunction) {
    try {
      const expectedVersion = req.body.expectedVersion ? Number(req.body.expectedVersion) : undefined;
      const result = await purchasingService.approvePO(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.id as string,
        expectedVersion
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async rejectPO(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchasingService.rejectPO(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.id as string,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async markPlaced(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchasingService.markPlacedManually(
        req.shopContext!.shopId,
        req.params.id as string
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async receivePOItems(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await purchasingService.receivePOItems(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.id as string,
        req.body,
        req.idempotencyKey
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async createPooledProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pooledPurchaseService.createProposal(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async listPooledProposals(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pooledPurchaseService.listProposals(req.query.status as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async joinPooledProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pooledPurchaseService.joinProposal(
        req.params.proposalId as string,
        req.shopContext!.shopId,
        req.user!.userId,
        Number(req.body.requestedQty)
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async approveShopPooledLiability(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await pooledPurchaseService.approveShopLiability(
        req.params.proposalId as string,
        req.shopContext!.shopId,
        req.user!.userId
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const purchasingController = new PurchasingController();
