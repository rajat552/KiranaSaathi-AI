import { Router } from 'express';
import { khataController } from './khata.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';

export const khataRouter = Router({ mergeParams: true });

khataRouter.use(authMiddleware);
khataRouter.use(tenantMiddleware());

khataRouter.get('/liquidity-context', khataController.getLiquidityContext);
khataRouter.get('/customers', khataController.getCustomers);
khataRouter.post('/customers', tenantMiddleware(['owner', 'manager']), khataController.createCustomer);
khataRouter.get('/customers/:customerId', khataController.getCustomer);
khataRouter.post('/customers/:customerId/credit', tenantMiddleware(['owner', 'manager', 'staff']), khataController.recordCredit);
khataRouter.post('/customers/:customerId/collect', tenantMiddleware(['owner', 'manager', 'staff']), khataController.recordCollection);
