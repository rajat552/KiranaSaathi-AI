import { Router } from 'express';
import { syncController } from './sync.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { validateBody } from '../../common/middleware/validation.middleware.js';
import { batchSyncSchema } from './sync.schema.js';

export const syncRouter = Router({ mergeParams: true });

syncRouter.use(authMiddleware);
syncRouter.use(tenantMiddleware());

syncRouter.post('/batch', validateBody(batchSyncSchema), syncController.batchSync);
