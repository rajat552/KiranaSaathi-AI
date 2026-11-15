import { Request, Response, NextFunction } from 'express';
import { forecastingService } from './forecasting.service.js';
import { budgetAllocationService } from './budget-allocation.service.js';
import { festivalService } from './festival.service.js';
import { aggregateDemandService } from './aggregate-demand.service.js';
import { sendSuccess } from '../../common/utils/response.js';

export class AnalyticsController {
  async getReorderRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const windowDays = req.query.windowDays ? Number(req.query.windowDays) : 14;
      const result = await forecastingService.getReplenishmentRecommendations(
        req.shopContext!.shopId,
        windowDays
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getProductForecast(req: Request, res: Response, next: NextFunction) {
    try {
      const windowDays = req.query.windowDays ? Number(req.query.windowDays) : 14;
      const result = await forecastingService.getProductForecast(
        req.shopContext!.shopId,
        req.params.productId as string,
        windowDays
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getExpiryRisks(req: Request, res: Response, next: NextFunction) {
    try {
      const horizonDays = req.query.horizonDays ? Number(req.query.horizonDays) : 30;
      const result = await forecastingService.getExpiryRisks(req.shopContext!.shopId, horizonDays);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSlowMoving(req: Request, res: Response, next: NextFunction) {
    try {
      const thresholdDays = req.query.thresholdDays ? Number(req.query.thresholdDays) : 14;
      const result = await forecastingService.getSlowMovingProducts(
        req.shopContext!.shopId,
        thresholdDays
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getDeadStockAnalysis(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await forecastingService.getDeadStockAnalysis(req.shopContext!.shopId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getBudgetReplenishment(req: Request, res: Response, next: NextFunction) {
    try {
      const budgetLimit = Number(req.body.budgetLimit || req.query.budgetLimit || 5000);
      const result = await budgetAllocationService.generateBudgetPlan(
        req.shopContext!.shopId,
        budgetLimit
      );
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getFestivalScenarios(req: Request, res: Response, next: NextFunction) {
    try {
      const festivalId = (req.query.festivalId as string) || 'diwali';
      const result = await festivalService.getFestivalScenarios(req.shopContext!.shopId, festivalId);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async getMarketDemandSignals(req: Request, res: Response, next: NextFunction) {
    try {
      const threshold = req.query.threshold ? Number(req.query.threshold) : 2;
      const result = await aggregateDemandService.getMarketDemandSignals(threshold);
      return sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
