import { Router } from 'express';
import { productController } from './product.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { validateBody, validateQuery } from '../../common/middleware/validation.middleware.js';
import { createProductSchema, updateProductSchema, listProductsQuerySchema } from './product.schema.js';

export const productRouter = Router({ mergeParams: true });

productRouter.use(authMiddleware);
productRouter.use(tenantMiddleware());

productRouter.get('/', validateQuery(listProductsQuerySchema), productController.listProducts);
productRouter.post('/', tenantMiddleware(['owner', 'manager']), validateBody(createProductSchema), productController.createProduct);

// Alias resolution & management
productRouter.post('/resolve-alias', productController.resolveAlias);
productRouter.post('/aliases/:aliasId/confirm', tenantMiddleware(['owner', 'manager']), productController.confirmAlias);

productRouter.get('/:productId', productController.getProduct);
productRouter.patch('/:productId', tenantMiddleware(['owner', 'manager']), validateBody(updateProductSchema), productController.updateProduct);
productRouter.post('/:productId/aliases', tenantMiddleware(['owner', 'manager']), productController.addAlias);
productRouter.get('/:productId/aliases', productController.getAliases);
