import { Router } from 'express';
import { inventoryController } from './inventory.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { idempotencyMiddleware } from '../../common/middleware/idempotency.middleware.js';
import { validateBody, validateQuery } from '../../common/middleware/validation.middleware.js';
import {
  stockReceiptSchema,
  stockAdjustmentSchema,
  openingBalanceSchema,
  listMovementsQuerySchema
} from './inventory.schema.js';

export const inventoryRouter = Router({ mergeParams: true });

inventoryRouter.use(authMiddleware);
inventoryRouter.use(tenantMiddleware());

// Reads
inventoryRouter.get('/', inventoryController.getOverview);
inventoryRouter.get('/movements', validateQuery(listMovementsQuerySchema), inventoryController.listMovements);
inventoryRouter.get('/reconcile', tenantMiddleware(['owner', 'manager']), inventoryController.reconcile);

// Mutations
inventoryRouter.post(
  '/opening-balance',
  tenantMiddleware(['owner', 'manager']),
  idempotencyMiddleware(false),
  validateBody(openingBalanceSchema),
  inventoryController.setOpeningBalance
);

inventoryRouter.post(
  '/receipts',
  tenantMiddleware(['owner', 'manager', 'staff']),
  idempotencyMiddleware(true),
  validateBody(stockReceiptSchema),
  inventoryController.recordReceipt
);

inventoryRouter.post(
  '/adjustments',
  tenantMiddleware(['owner', 'manager']),
  idempotencyMiddleware(true),
  validateBody(stockAdjustmentSchema),
  inventoryController.recordAdjustment
);
