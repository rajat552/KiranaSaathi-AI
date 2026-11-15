import { Router } from 'express';
import { purchasingController } from './purchasing.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { idempotencyMiddleware } from '../../common/middleware/idempotency.middleware.js';
import { validateBody } from '../../common/middleware/validation.middleware.js';
import { createPODraftSchema, rejectPOSchema, receivePOItemsSchema } from './purchasing.schema.js';

export const purchasingRouter = Router({ mergeParams: true });

purchasingRouter.use(authMiddleware);
purchasingRouter.use(tenantMiddleware());

purchasingRouter.get('/', purchasingController.listPOs);
purchasingRouter.get('/:id', purchasingController.getPO);

purchasingRouter.post(
  '/',
  tenantMiddleware(['owner', 'manager']),
  validateBody(createPODraftSchema),
  purchasingController.createDraft
);

purchasingRouter.post(
  '/:id/approve',
  tenantMiddleware(['owner']), // Owner-only approval invariant
  purchasingController.approvePO
);

purchasingRouter.post(
  '/:id/reject',
  tenantMiddleware(['owner']),
  validateBody(rejectPOSchema),
  purchasingController.rejectPO
);

purchasingRouter.post(
  '/:id/placed',
  tenantMiddleware(['owner', 'manager']),
  purchasingController.markPlaced
);

purchasingRouter.post(
  '/:id/receive',
  tenantMiddleware(['owner', 'manager']),
  idempotencyMiddleware(true),
  validateBody(receivePOItemsSchema),
  purchasingController.receivePOItems
);

// PS-15: Pooled Purchasing Proposals
purchasingRouter.get('/pooled/proposals', purchasingController.listPooledProposals);
purchasingRouter.post('/pooled/proposals', tenantMiddleware(['owner', 'manager']), purchasingController.createPooledProposal);
purchasingRouter.post('/pooled/proposals/:proposalId/join', tenantMiddleware(['owner', 'manager']), purchasingController.joinPooledProposal);
purchasingRouter.post('/pooled/proposals/:proposalId/approve', tenantMiddleware(['owner']), purchasingController.approveShopPooledLiability);
