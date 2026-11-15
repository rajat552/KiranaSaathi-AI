import express from 'express';
import cors from 'cors';
import path from 'path';
import { env } from './config/env.js';
import { requestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { errorHandler } from './common/middleware/error.middleware.js';

import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { shopRouter } from './modules/shops/shop.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { inventoryRouter } from './modules/inventory/inventory.routes.js';
import { saleRouter } from './modules/sales/sale.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { supplierRouter } from './modules/suppliers/supplier.routes.js';
import { purchasingRouter } from './modules/purchasing/purchasing.routes.js';
import { agentRouter } from './modules/agent/agent.routes.js';
import { syncRouter } from './modules/sync/sync.routes.js';
import { voiceRouter } from './modules/voice/voice.routes.js';
import { noPosRouter } from './modules/nopos/nopos.routes.js';
import { khataRouter } from './modules/khata/khata.routes.js';

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestIdMiddleware);

  // Serve thin static UI
  const publicDir = path.join(process.cwd(), 'public');
  app.use(express.static(publicDir));

  // Mount API modules
  const prefix = env.API_PREFIX;
  app.use(`${prefix}/health`, healthRouter);
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/shops`, shopRouter);
  app.use(`${prefix}/shops/:shopId/products`, productRouter);
  app.use(`${prefix}/shops/:shopId/inventory`, inventoryRouter);
  app.use(`${prefix}/shops/:shopId/sales`, saleRouter);
  app.use(`${prefix}/shops/:shopId/analytics`, analyticsRouter);
  app.use(`${prefix}/shops/:shopId/suppliers`, supplierRouter);
  app.use(`${prefix}/shops/:shopId/purchase-orders`, purchasingRouter);
  app.use(`${prefix}/shops/:shopId/agent`, agentRouter);
  app.use(`${prefix}/shops/:shopId/sync`, syncRouter);
  app.use(`${prefix}/shops/:shopId/voice`, voiceRouter);
  app.use(`${prefix}/shops/:shopId/nopos`, noPosRouter);
  app.use(`${prefix}/shops/:shopId/khata`, khataRouter);

  // Root fallback to frontend SPA
  app.get('/', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
