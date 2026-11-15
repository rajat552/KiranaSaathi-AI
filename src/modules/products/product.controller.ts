import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service.js';
import { productAliasService } from './product-alias.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class ProductController {
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.createProduct(
        req.shopContext!.shopId,
        req.user!.userId,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.getProduct(req.shopContext!.shopId, req.params.productId as string);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.updateProduct(
        req.shopContext!.shopId,
        req.params.productId as string,
        req.body
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productService.listProducts(req.shopContext!.shopId, req.query as any);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async addAlias(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productAliasService.addAlias(
        req.shopContext!.shopId,
        req.params.productId as string,
        req.body
      );
      return sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async getAliases(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productAliasService.getAliasesForProduct(
        req.shopContext!.shopId,
        req.params.productId as string
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async resolveAlias(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body;
      const result = await productAliasService.resolveAlias(req.shopContext!.shopId, query);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async confirmAlias(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await productAliasService.confirmAlias(
        req.shopContext!.shopId,
        req.params.aliasId as string,
        req.body.productId
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const productController = new ProductController();
