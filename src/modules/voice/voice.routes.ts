import { Router } from 'express';
import { voiceController } from './voice.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';

export const voiceRouter = Router({ mergeParams: true });

voiceRouter.use(authMiddleware);
voiceRouter.use(tenantMiddleware());

voiceRouter.post('/command', voiceController.parseCommand);
