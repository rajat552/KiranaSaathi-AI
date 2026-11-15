import { Router } from 'express';
import { analyticsController } from './analytics.controller.js';
import { authMiddleware } from '../../common/middleware/auth.middleware.js';
import { tenantMiddleware } from '../../common/middleware/tenant.middleware.js';

export const analyticsRouter = Router({ mergeParams: true });

analyticsRouter.use(authMiddleware);
analyticsRouter.use(tenantMiddleware());

analyticsRouter.get('/reorder-recommendations', analyticsController.getReorderRecommendations);
analyticsRouter.get('/forecast/:productId', analyticsController.getProductForecast);
analyticsRouter.get('/expiry-risks', analyticsController.getExpiryRisks);
analyticsRouter.get('/slow-moving', analyticsController.getSlowMoving);
analyticsRouter.get('/dead-stock-analysis', analyticsController.getDeadStockAnalysis);
analyticsRouter.post('/budget-replenishment', analyticsController.getBudgetReplenishment);
analyticsRouter.get('/budget-replenishment', analyticsController.getBudgetReplenishment);
analyticsRouter.get('/festival-scenarios', analyticsController.getFestivalScenarios);
analyticsRouter.get('/aggregate-demand', analyticsController.getMarketDemandSignals);
