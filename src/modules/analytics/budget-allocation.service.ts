import mongoose from 'mongoose';
import { Product } from '../products/product.model.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { forecastingService } from './forecasting.service.js';
import { AppError } from '../../common/errors/app-error.js';

export interface AllocatedItem {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  unitCost: number;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  allocatedQty: number;
  lineCost: number;
  priorityScore: number;
  allocationReason: string;
}

export interface DeferredItem {
  productId: string;
  productName: string;
  category: string;
  unitCost: number;
  neededQty: number;
  estimatedCost: number;
  priorityScore: number;
  deferralReason: string;
}

export interface BudgetReplenishmentPlan {
  budgetLimit: number;
  allocatedAmount: number;
  remainingCashBuffer: number;
  utilizationPercentage: number;
  allocatedItems: AllocatedItem[];
  deferredItems: DeferredItem[];
  summaryNote: string;
}

export class BudgetAllocationService {
  /**
   * PS-12: Cash-Constrained Multi-SKU Replenishment Allocation
   * Solves bounded allocation under hard owner-specified cash budget
   */
  async generateBudgetPlan(shopId: string, budgetLimit: number): Promise<BudgetReplenishmentPlan> {
    if (budgetLimit <= 0) {
      throw AppError.badRequest('Budget limit must be a positive cash amount');
    }

    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    // Get unconstrained replenishment recommendations from forecasting engine
    const recommendations = await forecastingService.getReplenishmentRecommendations(shopId, 14);

    // Filter to candidates needing replenishment
    const candidates = recommendations.filter(
      r => r.needsReorder || r.currentStock <= r.reorderPoint || r.suggestedReorderQty > 0
    );

    if (candidates.length === 0) {
      return {
        budgetLimit,
        allocatedAmount: 0,
        remainingCashBuffer: budgetLimit,
        utilizationPercentage: 0,
        allocatedItems: [],
        deferredItems: [],
        summaryNote: 'All products currently have adequate stock cover. No purchases required.'
      };
    }

    // Fetch product details for cost price and margin
    const productIds = candidates.map(c => new mongoose.Types.ObjectId(c.productId));
    const products = await Product.find({ _id: { $in: productIds }, shopId: shopObjectId });
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    // Score and rank each candidate
    interface ScoredCandidate {
      rec: typeof candidates[0];
      prod: typeof products[0];
      priorityScore: number;
      unitCost: number;
      neededQty: number;
      totalNeededCost: number;
    }

    const scoredList: ScoredCandidate[] = [];

    for (const rec of candidates) {
      const prod = productMap.get(rec.productId);
      if (!prod || prod.costPrice <= 0) continue;

      const unitCost = prod.costPrice;
      const neededQty = rec.suggestedReorderQty > 0 ? rec.suggestedReorderQty : Math.max(1, rec.reorderPoint - rec.currentStock);
      const totalNeededCost = neededQty * unitCost;

      // Scoring factors:
      // 1. Urgency / Runout factor (0-1): Lower days remaining = higher urgency
      const daysRemaining = rec.estimatedDaysRemaining;
      const urgencyScore = daysRemaining <= 1 ? 1.0 : daysRemaining <= 3 ? 0.8 : daysRemaining <= 7 ? 0.6 : 0.3;

      // 2. Velocity factor (0-1): High turnover staple
      const dailyDemand = rec.averageDailyDemand;
      const velocityScore = dailyDemand >= 10 ? 1.0 : dailyDemand >= 5 ? 0.8 : dailyDemand >= 1 ? 0.5 : 0.2;

      // 3. Margin factor (0-1): Profit contribution
      const margin = (prod.sellingPrice - prod.costPrice) / (prod.sellingPrice || 1);
      const marginScore = Math.min(1.0, Math.max(0.1, margin * 2));

      // Weighted Priority Score (0 to 100)
      const priorityScore = Math.round(
        (urgencyScore * 0.45 + velocityScore * 0.35 + marginScore * 0.20) * 100
      );

      scoredList.push({
        rec,
        prod,
        priorityScore,
        unitCost,
        neededQty,
        totalNeededCost
      });
    }

    // Sort by priority descending (highest urgency & velocity first)
    scoredList.sort((a, b) => b.priorityScore - a.priorityScore);

    // Greedy allocation under hard cash ceiling
    let remainingBudget = budgetLimit;
    const allocatedItems: AllocatedItem[] = [];
    const deferredItems: DeferredItem[] = [];

    for (const item of scoredList) {
      if (remainingBudget <= 0) {
        deferredItems.push({
          productId: item.prod._id.toString(),
          productName: item.prod.name,
          category: item.prod.category,
          unitCost: item.unitCost,
          neededQty: item.neededQty,
          estimatedCost: item.totalNeededCost,
          priorityScore: item.priorityScore,
          deferralReason: `Budget fully exhausted (Remaining cash: ₹0.00). Prioritised higher velocity staples.`
        });
        continue;
      }

      // Check how many units we can afford
      const maxAffordableUnits = Math.floor(remainingBudget / item.unitCost);

      if (maxAffordableUnits >= item.neededQty) {
        // Full allocation
        const lineCost = item.neededQty * item.unitCost;
        remainingBudget -= lineCost;

        allocatedItems.push({
          productId: item.prod._id.toString(),
          productName: item.prod.name,
          category: item.prod.category,
          unit: item.prod.unit,
          unitCost: item.unitCost,
          currentStock: item.rec.currentStock,
          reorderPoint: item.rec.reorderPoint,
          suggestedQty: item.neededQty,
          allocatedQty: item.neededQty,
          lineCost,
          priorityScore: item.priorityScore,
          allocationReason: `High priority staple (Score: ${item.priorityScore}). Fully allocated to maintain ${item.rec.safetyCoverDays} days cover.`
        });
      } else if (maxAffordableUnits > 0) {
        // Partial allocation within remaining budget
        const lineCost = maxAffordableUnits * item.unitCost;
        remainingBudget -= lineCost;

        allocatedItems.push({
          productId: item.prod._id.toString(),
          productName: item.prod.name,
          category: item.prod.category,
          unit: item.prod.unit,
          unitCost: item.unitCost,
          currentStock: item.rec.currentStock,
          reorderPoint: item.rec.reorderPoint,
          suggestedQty: item.neededQty,
          allocatedQty: maxAffordableUnits,
          lineCost,
          priorityScore: item.priorityScore,
          allocationReason: `Partially allocated ${maxAffordableUnits}/${item.neededQty} units to stay within ₹${budgetLimit} cash budget.`
        });
      } else {
        // Cannot afford even 1 unit
        deferredItems.push({
          productId: item.prod._id.toString(),
          productName: item.prod.name,
          category: item.prod.category,
          unitCost: item.unitCost,
          neededQty: item.neededQty,
          estimatedCost: item.totalNeededCost,
          priorityScore: item.priorityScore,
          deferralReason: `Unit cost ₹${item.unitCost} exceeds available cash buffer of ₹${Math.round(remainingBudget * 100) / 100}.`
        });
      }
    }

    const allocatedAmount = Math.round((budgetLimit - remainingBudget) * 100) / 100;
    const remainingCashBuffer = Math.round(remainingBudget * 100) / 100;
    const utilizationPercentage = Math.round((allocatedAmount / budgetLimit) * 1000) / 10;

    let summaryNote = `Allocated ₹${allocatedAmount} across ${allocatedItems.length} SKUs (${utilizationPercentage}% of ₹${budgetLimit} cash budget).`;
    if (deferredItems.length > 0) {
      summaryNote += ` ${deferredItems.length} SKU(s) deferred to prevent cash deficit.`;
    }

    return {
      budgetLimit,
      allocatedAmount,
      remainingCashBuffer,
      utilizationPercentage,
      allocatedItems,
      deferredItems,
      summaryNote
    };
  }
}

export const budgetAllocationService = new BudgetAllocationService();
