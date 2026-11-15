import { Router } from 'express';
import { agentController } from './agent.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';

export const agentRouter = Router({ mergeParams: true });

agentRouter.use(authMiddleware);
agentRouter.use(tenantMiddleware());

agentRouter.post('/chat', agentController.chat);
agentRouter.get('/runs', agentController.listRuns);
