import { Router } from 'express';
import { supplierController } from './supplier.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { validateBody } from '../../common/middleware/validation.middleware.js';
import { createSupplierSchema, recordQuoteSchema } from './supplier.schema.js';

export const supplierRouter = Router({ mergeParams: true });

supplierRouter.use(authMiddleware);
supplierRouter.use(tenantMiddleware());

supplierRouter.get('/', supplierController.listSuppliers);
supplierRouter.post('/', tenantMiddleware(['owner', 'manager']), validateBody(createSupplierSchema), supplierController.createSupplier);
supplierRouter.post('/:supplierId/quotes', tenantMiddleware(['owner', 'manager']), validateBody(recordQuoteSchema), supplierController.recordQuote);
supplierRouter.get('/compare/:productId', supplierController.compareQuotes);
