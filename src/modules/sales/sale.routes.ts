import { Router } from 'express';
import { saleController } from './sale.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { idempotencyMiddleware } from '../../common/middleware/idempotency.middleware.js';
import { validateBody, validateQuery } from '../../common/middleware/validation.middleware.js';
import { createSaleSchema, listSalesQuerySchema } from './sale.schema.js';

export const saleRouter = Router({ mergeParams: true });

saleRouter.use(authMiddleware);
saleRouter.use(tenantMiddleware());

saleRouter.get('/', validateQuery(listSalesQuerySchema), saleController.listSales);
saleRouter.post(
  '/',
  tenantMiddleware(['owner', 'manager', 'staff']),
  idempotencyMiddleware(true),
  validateBody(createSaleSchema),
  saleController.recordSale
);
