import mongoose from 'mongoose';
import { Product } from '../products/product.model.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { forecastingService } from './forecasting.service.js';

export interface FestivalEvent {
  id: string;
  name: string;
  region: string;
  seasonMonth: string;
  leadTimeDays: number;
  durationDays: number;
  targetCategories: string[];
}

export const INDIAN_FESTIVALS: FestivalEvent[] = [
  {
    id: 'diwali',
    name: 'Diwali & Dhanteras',
    region: 'Pan-India',
    seasonMonth: 'October-November',
    leadTimeDays: 14,
    durationDays: 5,
    targetCategories: ['Sweets', 'Dairy', 'Edible Oil', 'Dry Fruits', 'Snacks', 'Beverages', 'Groceries', 'Staples']
  },
  {
    id: 'eid',
    name: 'Eid-ul-Fitr',
    region: 'Pan-India',
    seasonMonth: 'March-April',
    leadTimeDays: 10,
    durationDays: 3,
    targetCategories: ['Dairy', 'Dry Fruits', 'Staples', 'Beverages', 'Spices']
  },
  {
    id: 'holi',
    name: 'Holi',
    region: 'North & Central India',
    seasonMonth: 'March',
    leadTimeDays: 7,
    durationDays: 2,
    targetCategories: ['Dairy', 'Beverages', 'Snacks', 'Sweets', 'Staples']
  },
  {
    id: 'pongal_sankranti',
    name: 'Pongal / Makar Sankranti',
    region: 'South & West India',
    seasonMonth: 'January',
    leadTimeDays: 7,
    durationDays: 4,
    targetCategories: ['Staples', 'Dairy', 'Groceries', 'Sweets']
  }
];

export interface FestivalSkuProjection {
  productId: string;
  productName: string;
  category: string;
  unitCost: number;
  currentStock: number;
  baselineDailyDemand: number;
  scenarioMultiplier: number;
  projectedDailyDemand: number;
  totalFestivalProjectedDemand: number;
  suggestedStockBuild: number;
  incrementalUnitsToOrder: number;
  estimatedOrderCost: number;
  expirySafe: boolean;
}

export interface FestivalScenario {
  scenarioName: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  multiplier: number;
  totalIncrementalCapital: number;
  skusCount: number;
  items: FestivalSkuProjection[];
  assumptions: string;
}

export interface FestivalPlanResult {
  festival: FestivalEvent;
  scenarios: {
    conservative: FestivalScenario;
    moderate: FestivalScenario;
    aggressive: FestivalScenario;
  };
  dataSufficiencyIndicator: 'HIGH_HISTORY' | 'MODERATE_HISTORY' | 'PRIOR_ESTIMATES';
  ownerDisclaimer: string;
}

export class FestivalService {
  async getFestivalScenarios(shopId: string, festivalId = 'diwali'): Promise<FestivalPlanResult> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const festival =
      INDIAN_FESTIVALS.find(f => f.id === festivalId.toLowerCase()) || INDIAN_FESTIVALS[0];

    // Fetch products and current stock
    const products = await Product.find({ shopId: shopObjectId, status: 'active' });
    const balances = await StockBalance.find({ shopId: shopObjectId });
    const balanceMap = new Map(balances.map(b => [b.productId.toString(), b.onHandQty]));

    // Fetch baseline demand from forecasting service
    const recs = await forecastingService.getReplenishmentRecommendations(shopId, 14);
    const recMap = new Map(recs.map(r => [r.productId, r]));

    const buildScenario = (
      name: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE',
      baseMultiplier: number,
      assumptionText: string
    ): FestivalScenario => {
      const items: FestivalSkuProjection[] = [];
      let totalIncrementalCapital = 0;

      for (const prod of products) {
        const pid = prod._id.toString();
        const currentStock = balanceMap.get(pid) || 0;
        const rec = recMap.get(pid);
        const baselineDemand = rec && rec.averageDailyDemand > 0 ? rec.averageDailyDemand : 2.0;

        // Is this product in a festival-boosted category?
        const isTarget = festival.targetCategories.some(
          cat => cat.toLowerCase() === prod.category.toLowerCase()
        );

        const skuMultiplier = isTarget ? baseMultiplier : 1.0;
        const projectedDailyDemand = Math.round(baselineDemand * skuMultiplier * 10) / 10;
        const totalFestivalProjectedDemand = Math.round(
          projectedDailyDemand * (festival.durationDays + festival.leadTimeDays)
        );

        const suggestedStockBuild = totalFestivalProjectedDemand;
        const incrementalUnitsToOrder = Math.max(0, suggestedStockBuild - currentStock);
        const estimatedOrderCost = Math.round(incrementalUnitsToOrder * prod.costPrice * 100) / 100;

        totalIncrementalCapital += estimatedOrderCost;

        items.push({
          productId: pid,
          productName: prod.name,
          category: prod.category,
          unitCost: prod.costPrice,
          currentStock,
          baselineDailyDemand: baselineDemand,
          scenarioMultiplier: skuMultiplier,
          projectedDailyDemand,
          totalFestivalProjectedDemand,
          suggestedStockBuild,
          incrementalUnitsToOrder,
          estimatedOrderCost,
          expirySafe: true
        });
      }

      items.sort((a, b) => b.estimatedOrderCost - a.estimatedOrderCost);

      return {
        scenarioName: name,
        multiplier: baseMultiplier,
        totalIncrementalCapital: Math.round(totalIncrementalCapital * 100) / 100,
        skusCount: items.filter(i => i.incrementalUnitsToOrder > 0).length,
        items,
        assumptions: assumptionText
      };
    };

    return {
      festival,
      scenarios: {
        conservative: buildScenario(
          'CONSERVATIVE',
          1.25,
          'Assumes +25% uplift for festival categories. Low cash exposure, minimal risk of post-festival dead stock.'
        ),
        moderate: buildScenario(
          'MODERATE',
          1.6,
          'Assumes +60% uplift based on standard festive grocery shopping patterns. Balanced risk-reward.'
        ),
        aggressive: buildScenario(
          'AGGRESSIVE',
          2.2,
          'Assumes +120% surge for festive rush. Maximizes sales capture; requires sufficient cash liquidity.'
        )
      },
      dataSufficiencyIndicator: recs.some(r => r.dataQuality === 'HIGH')
        ? 'HIGH_HISTORY'
        : 'MODERATE_HISTORY',
      ownerDisclaimer:
        'Festival forecasts provide structured scenario modeling. The shop owner retains complete discretion to select order quantities.'
    };
  }
}

export const festivalService = new FestivalService();
