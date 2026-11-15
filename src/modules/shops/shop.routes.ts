import { Router } from 'express';
import { shopController } from './shop.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { validateBody } from '../../common/middleware/validation.middleware.js';
import { createShopSchema, addMemberSchema } from './shop.schema.js';

export const shopRouter = Router();

shopRouter.use(authMiddleware);

// Create a new shop (any authenticated user can create their shop)
shopRouter.post('/', validateBody(createShopSchema), shopController.createShop);

// Shop-scoped endpoints: require membership
shopRouter.get('/:shopId', tenantMiddleware(), shopController.getShop);
shopRouter.get('/:shopId/activation-status', tenantMiddleware(), shopController.getActivationStatus);
shopRouter.get('/:shopId/members', tenantMiddleware(['owner', 'manager']), shopController.listMembers);
shopRouter.post('/:shopId/members', tenantMiddleware(['owner']), validateBody(addMemberSchema), shopController.addMember);
