import mongoose from 'mongoose';
import { Product } from '../products/product.model.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { InventoryMovement } from '../inventory/inventory-movement.model.js';
import { InventoryLot } from '../inventory/inventory-lot.model.js';
import { Shop } from '../shops/shop.model.js';
import { PurchaseOrder } from '../purchasing/purchase-order.model.js';
import { AppError } from '../../common/errors/app-error.js';

export interface ReplenishmentRecommendation {
  productId: string;
  productName: string;
  brand?: string;
  category: string;
  unit: string;
  currentStock: number;
  inboundStock: number;
  averageDailyDemand: number;
  estimatedDaysRemaining: number;
  leadTimeDays: number;
  safetyCoverDays: number;
  reorderPoint: number;
  suggestedReorderQty: number;
  needsReorder: boolean;
  dataQuality: 'HIGH' | 'MODERATE' | 'LOW_DATA';
  confidenceScore: number; // 0 to 1
  historyDaysObserved: number;
  explanation: string;
  calculatedAt: string;
}

export class ForecastingService {
  /**
   * Calculates sales velocity, demand estimates, and explainable reorder recommendations for all products in a shop.
   */
  async getReplenishmentRecommendations(shopId: string, windowDays = 14): Promise<ReplenishmentRecommendation[]> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const shop = await Shop.findById(shopObjectId);
    if (!shop) throw AppError.notFound('Shop not found');

    const defaultLeadTime = shop.settings?.defaultLeadTimeDays || 3;
    const defaultSafetyCover = shop.settings?.defaultSafetyCoverDays || 7;

    const products = await Product.find({ shopId: shopObjectId, status: 'active' });
    const balances = await StockBalance.find({ shopId: shopObjectId });
    const balanceMap = new Map<string, number>();
    balances.forEach(b => balanceMap.set(b.productId.toString(), b.onHandQty));

    // Calculate pending/approved inbound purchase orders
    const approvedOrders = await PurchaseOrder.find({
      shopId: shopObjectId,
      status: { $in: ['APPROVED', 'PLACED_MANUALLY', 'PARTIALLY_RECEIVED'] }
    });

    const inboundMap = new Map<string, number>();
    for (const po of approvedOrders) {
      for (const item of po.items) {
        const remainingInbound = Math.max(0, item.requestedQty - (item.receivedQty || 0));
        const prev = inboundMap.get(item.productId.toString()) || 0;
        inboundMap.set(item.productId.toString(), prev + remainingInbound);
      }
    }

    // Window date
    const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // Aggregate sales movements within window
    const salesMovements = await InventoryMovement.aggregate([
      {
        $match: {
          shopId: shopObjectId,
          movementType: 'sale',
          createdAt: { $gte: windowStart }
        }
      },
      {
        $group: {
          _id: '$productId',
          totalSold: { $sum: { $abs: '$quantityDelta' } },
          distinctDays: {
            $addToSet: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            }
          }
        }
      }
    ]);

    const salesMap = new Map<string, { totalSold: number; activeDaysCount: number }>();
    salesMovements.forEach(s => {
      salesMap.set(s._id.toString(), {
        totalSold: s.totalSold,
        activeDaysCount: s.distinctDays.length
      });
    });

    const recommendations: ReplenishmentRecommendation[] = [];

    for (const product of products) {
      const pid = product._id.toString();
      const currentStock = balanceMap.get(pid) || 0;
      const inboundStock = inboundMap.get(pid) || 0;
      const salesStats = salesMap.get(pid);

      const targetCoverDays = product.targetCoverDays || defaultSafetyCover;
      const leadTimeDays = defaultLeadTime;

      let averageDailyDemand = 0;
      let dataQuality: 'HIGH' | 'MODERATE' | 'LOW_DATA' = 'LOW_DATA';
      let confidenceScore = 0.3;
      let historyDaysObserved = 0;

      if (salesStats && salesStats.totalSold > 0) {
        historyDaysObserved = salesStats.activeDaysCount;
        // Average over window days
        averageDailyDemand = Math.round((salesStats.totalSold / windowDays) * 100) / 100;

        if (salesStats.activeDaysCount >= Math.min(7, windowDays * 0.6)) {
          dataQuality = 'HIGH';
          confidenceScore = 0.9;
        } else {
          dataQuality = 'MODERATE';
          confidenceScore = 0.65;
        }
      } else {
        // Fallback when no sales recorded yet
        dataQuality = 'LOW_DATA';
        confidenceScore = 0.25;
        averageDailyDemand = 0;
      }

      // Calculations:
      // lead_time_demand = avg_daily_demand * lead_time_days
      // safety_stock = avg_daily_demand * targetCoverDays (or shopkeeper's configured reorderPoint)
      const leadTimeDemand = Math.round(averageDailyDemand * leadTimeDays * 10) / 10;
      const calculatedSafetyStock = Math.round(averageDailyDemand * targetCoverDays * 10) / 10;
      const reorderPoint = Math.max(product.reorderPoint, leadTimeDemand + calculatedSafetyStock);

      const netAvailable = currentStock + inboundStock;
      const targetStockLevel = Math.max(reorderPoint * 1.5, Math.round(averageDailyDemand * (leadTimeDays + targetCoverDays)));

      let suggestedReorderQty = 0;
      const needsReorder = netAvailable <= reorderPoint;

      if (needsReorder) {
        suggestedReorderQty = Math.max(1, Math.ceil(targetStockLevel - netAvailable));
      }

      const estimatedDaysRemaining =
        averageDailyDemand > 0 ? Math.round((currentStock / averageDailyDemand) * 10) / 10 : currentStock > 0 ? 999 : 0;

      let explanation = '';
      if (dataQuality === 'LOW_DATA') {
        explanation = `Limited sales history observed over the past ${windowDays} days. Recommendation uses your configured minimum threshold of ${product.reorderPoint} ${product.unit}. Current stock is ${currentStock} ${product.unit}.`;
      } else {
        explanation = `Based on observed sales velocity of ${averageDailyDemand} ${product.unit}/day over ${windowDays} days. With a ${leadTimeDays}-day supplier lead time and ${targetCoverDays}-day safety cover, reorder threshold is ${reorderPoint} ${product.unit}. Net available is ${netAvailable} (on hand: ${currentStock}, inbound: ${inboundStock}). Suggested order: ${suggestedReorderQty} ${product.unit}.`;
      }

      recommendations.push({
        productId: pid,
        productName: product.name,
        brand: product.brand,
        category: product.category,
        unit: product.unit,
        currentStock,
        inboundStock,
        averageDailyDemand,
        estimatedDaysRemaining,
        leadTimeDays,
        safetyCoverDays: targetCoverDays,
        reorderPoint,
        suggestedReorderQty,
        needsReorder,
        dataQuality,
        confidenceScore,
        historyDaysObserved,
        explanation,
        calculatedAt: new Date().toISOString()
      });
    }

    return recommendations;
  }

  /**
   * Retrieves specific demand forecast and explainable reasoning for a single product.
   */
  async getProductForecast(shopId: string, productId: string, windowDays = 14) {
    const all = await this.getReplenishmentRecommendations(shopId, windowDays);
    const match = all.find(r => r.productId === productId);
    if (!match) throw AppError.notFound('Product forecast not found');
    return match;
  }

  /**
   * Identifies near-expiry risks and expired inventory lots.
   */
  async getExpiryRisks(shopId: string, horizonDays = 30) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const horizonDate = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000);
    const now = new Date();

    const lots = await InventoryLot.find({
      shopId: shopObjectId,
      remainingQty: { $gt: 0 },
      expiryDate: { $lte: horizonDate }
    })
      .populate('productId', 'name unit costPrice sellingPrice')
      .sort({ expiryDate: 1 });

    return lots.map(lot => {
      const isExpired = lot.expiryDate < now;
      const daysUntilExpiry = Math.ceil((lot.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const tiedCapital = Math.round(lot.remainingQty * lot.unitCost * 100) / 100;

      return {
        lotId: lot._id.toString(),
        productId: (lot.productId as any)?._id?.toString() || lot.productId.toString(),
        productName: (lot.productId as any)?.name || 'Unknown Product',
        unit: (lot.productId as any)?.unit || 'PCS',
        batchCode: lot.batchCode,
        remainingQty: lot.remainingQty,
        unitCost: lot.unitCost,
        tiedCapital,
        expiryDate: lot.expiryDate,
        daysUntilExpiry,
        status: isExpired ? 'EXPIRED' : daysUntilExpiry <= 7 ? 'CRITICAL_NEAR_EXPIRY' : 'WARNING_NEAR_EXPIRY'
      };
    });
  }

  /**
   * Identifies slow-moving products (items with high stock but low/zero sales velocity).
   */
  async getSlowMovingProducts(shopId: string, thresholdDays = 14) {
    const recommendations = await this.getReplenishmentRecommendations(shopId, thresholdDays);

    return recommendations
      .filter(r => r.currentStock > 0 && r.averageDailyDemand === 0)
      .map(r => ({
        productId: r.productId,
        productName: r.productName,
        category: r.category,
        unit: r.unit,
        currentStock: r.currentStock,
        daysWithZeroSales: thresholdDays,
        status: 'SLOW_MOVING',
        recommendation: `No sales observed in ${thresholdDays} days. Consider bundle promotions or reducing shelf allocation.`
      }));
  }

  /**
   * PS-01: Multi-bracket Ageing & Landed Cost Dead Stock Analysis
   */
  async getDeadStockAnalysis(shopId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const now = new Date();

    const [products, balances] = await Promise.all([
      Product.find({ shopId: shopObjectId, status: 'active' }),
      StockBalance.find({ shopId: shopObjectId, onHandQty: { $gt: 0 } })
    ]);

    const balanceMap = new Map(balances.map(b => [b.productId.toString(), b.onHandQty]));

    const items = [];
    const summary = {
      totalLockedCapital: 0,
      bucket0_30: { count: 0, capital: 0 },
      bucket31_60: { count: 0, capital: 0 },
      bucket61_90: { count: 0, capital: 0 },
      bucket90Plus: { count: 0, capital: 0 }
    };

    for (const prod of products) {
      const pid = prod._id.toString();
      const onHand = balanceMap.get(pid) || 0;
      if (onHand <= 0) continue;

      const tiedCapital = Math.round(onHand * prod.costPrice * 100) / 100;
      summary.totalLockedCapital = Math.round((summary.totalLockedCapital + tiedCapital) * 100) / 100;

      // Find last sale movement
      const lastSale = await InventoryMovement.findOne({
        shopId: shopObjectId,
        productId: prod._id,
        movementType: 'sale'
      }).sort({ createdAt: -1 });

      let daysSinceLastActivity: number;
      if (lastSale) {
        daysSinceLastActivity = Math.max(0, Math.floor((now.getTime() - lastSale.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        daysSinceLastActivity = Math.max(0, Math.floor((now.getTime() - prod.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      }

      let bucket: '0-30' | '31-60' | '61-90' | '90+';
      let actionRecommendation: string;

      if (daysSinceLastActivity <= 30) {
        bucket = '0-30';
        summary.bucket0_30.count++;
        summary.bucket0_30.capital = Math.round((summary.bucket0_30.capital + tiedCapital) * 100) / 100;
        actionRecommendation = 'Normal inventory velocity. Maintain standard reorder cycle.';
      } else if (daysSinceLastActivity <= 60) {
        bucket = '31-60';
        summary.bucket31_60.count++;
        summary.bucket31_60.capital = Math.round((summary.bucket31_60.capital + tiedCapital) * 100) / 100;
        actionRecommendation = 'Velocity slowing. Place near checkout counter or bundle with fast-moving staples.';
      } else if (daysSinceLastActivity <= 90) {
        bucket = '61-90';
        summary.bucket61_90.count++;
        summary.bucket61_90.capital = Math.round((summary.bucket61_90.capital + tiedCapital) * 100) / 100;
        actionRecommendation = 'High capital risk. Apply 10-15% markdown or negotiate distributor return.';
      } else {
        bucket = '90+';
        summary.bucket90Plus.count++;
        summary.bucket90Plus.capital = Math.round((summary.bucket90Plus.capital + tiedCapital) * 100) / 100;
        actionRecommendation = 'Dead stock. Urgent capital recovery: liquidate at landed cost or record tax write-off.';
      }

      items.push({
        productId: pid,
        productName: prod.name,
        category: prod.category,
        onHandQty: onHand,
        costPrice: prod.costPrice,
        sellingPrice: prod.sellingPrice,
        tiedCapital,
        daysSinceLastActivity,
        ageingBucket: bucket,
        actionRecommendation
      });
    }

    items.sort((a, b) => b.tiedCapital - a.tiedCapital);

    return {
      summary,
      items
    };
  }
}

export const forecastingService = new ForecastingService();
