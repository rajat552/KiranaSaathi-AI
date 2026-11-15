import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Membership } from '../../modules/shops/membership.model.js';
import { Role } from '../types/index.js';
import { AppError } from '../errors/app-error.js';

export function tenantMiddleware(allowedRoles?: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }

    const shopId = req.params.shopId || req.body?.shopId || (req.query?.shopId as string);

    if (!shopId) {
      next(AppError.badRequest('Shop ID parameter is required for tenant-scoped operations'));
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      next(AppError.badRequest('Invalid shop ID format'));
      return;
    }

    try {
      const membership = await Membership.findOne({
        shopId: new mongoose.Types.ObjectId(shopId),
        userId: new mongoose.Types.ObjectId(req.user.userId),
        status: 'active'
      });

      if (!membership) {
        next(AppError.forbidden('Access denied: You are not an authorized member of this shop'));
        return;
      }

      if (allowedRoles && allowedRoles.length > 0) {
        if (!allowedRoles.includes(membership.role)) {
          next(AppError.forbidden(`Action requires one of the following roles: ${allowedRoles.join(', ')}`));
          return;
        }
      }

      req.shopContext = {
        shopId: membership.shopId.toString(),
        role: membership.role
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
