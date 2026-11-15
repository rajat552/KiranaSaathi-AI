import { Request, Response, NextFunction } from 'express';
import { noPosService } from './nopos.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class NoPosController {
  async recordSnapshot(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.recordSnapshot(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body.items,
        req.body.notes
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async recordDepletion(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.recordDepletion(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async ingestInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.ingestInvoice(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async verifyInvoiceLine(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.verifyInvoiceLine(
        req.shopContext!.shopId,
        req.params.invoiceId as string,
        req.params.lineId as string,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async commitInvoice(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.commitInvoice(
        req.shopContext!.shopId,
        req.user!.userId,
        req.params.invoiceId as string
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getInvoices(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.getInvoices(
        req.shopContext!.shopId,
        req.query.status as string | undefined
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSnapshots(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.getSnapshots(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getDepletions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await noPosService.getDepletions(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const noPosController = new NoPosController();
