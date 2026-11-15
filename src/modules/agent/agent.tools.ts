import { z } from 'zod';
import { inventoryService } from '../inventory/inventory.service.js';
import { forecastingService } from '../analytics/forecasting.service.js';
import { budgetAllocationService } from '../analytics/budget-allocation.service.js';
import { khataService } from '../khata/khata.service.js';
import { festivalService } from '../analytics/festival.service.js';
import { productAliasService } from '../products/product-alias.service.js';
import { supplierService } from '../suppliers/supplier.service.js';
import { purchasingService } from '../purchasing/purchasing.service.js';
import { Role } from '../../common/types/index.js';

export interface AgentContext {
  shopId: string;
  userId: string;
  role: Role;
}

export interface AgentToolDef<TParams = any> {
  name: string;
  description: string;
  parameters: z.ZodSchema<TParams>;
  requiredRoles?: Role[];
  execute: (context: AgentContext, params: TParams) => Promise<any>;
}

export const agentToolRegistry: Record<string, AgentToolDef> = {
  get_inventory_summary: {
    name: 'get_inventory_summary',
    description: 'Get current on-hand stock and low-stock indicators for all active products in the shop',
    parameters: z.object({}),
    execute: async (context) => {
      return inventoryService.getInventorySummary(context.shopId);
    }
  },

  get_low_stock_items: {
    name: 'get_low_stock_items',
    description: 'List products currently at or below their reorder threshold requiring replenishment',
    parameters: z.object({}),
    execute: async (context) => {
      const summary = await inventoryService.getInventorySummary(context.shopId);
      return summary.filter(s => s.isLowStock);
    }
  },

  get_expiry_risks: {
    name: 'get_expiry_risks',
    description: 'Get batches/lots approaching expiry within the specified horizon days',
    parameters: z.object({
      horizonDays: z.number().min(1).default(30)
    }),
    execute: async (context, params) => {
      return forecastingService.getExpiryRisks(context.shopId, params.horizonDays || 30);
    }
  },

  calculate_reorder: {
    name: 'calculate_reorder',
    description: 'Calculate explainable demand estimates, sales velocity, and reorder quantities for products',
    parameters: z.object({
      windowDays: z.number().min(7).max(60).default(14)
    }),
    requiredRoles: ['owner', 'manager'],
    execute: async (context, params) => {
      const all = await forecastingService.getReplenishmentRecommendations(context.shopId, params.windowDays || 14);
      return all.filter(r => r.needsReorder);
    }
  },

  get_dead_stock_summary: {
    name: 'get_dead_stock_summary',
    description: 'Analyze dead stock and capital locked across ageing brackets (0-30d, 31-60d, 61-90d, 90+d) with landed-cost valuation and markdown suggestions',
    parameters: z.object({}),
    requiredRoles: ['owner', 'manager'],
    execute: async (context) => {
      return forecastingService.getDeadStockAnalysis(context.shopId);
    }
  },

  get_cash_budget_plan: {
    name: 'get_cash_budget_plan',
    description: 'Compute cash-constrained multi-SKU replenishment allocation respecting a hard owner cash budget cap',
    parameters: z.object({
      budgetLimit: z.number().positive().default(5000)
    }),
    requiredRoles: ['owner', 'manager'],
    execute: async (context, params) => {
      return budgetAllocationService.generateBudgetPlan(context.shopId, params.budgetLimit || 5000);
    }
  },

  get_khata_summary: {
    name: 'get_khata_summary',
    description: 'Review customer credit (Khata) receivables and enforce core liquidity invariant (uncollected credit excluded from purchase cash)',
    parameters: z.object({}),
    requiredRoles: ['owner', 'manager'],
    execute: async (context) => {
      return khataService.getLiquidityContext(context.shopId);
    }
  },

  plan_festival_demand: {
    name: 'plan_festival_demand',
    description: 'Get festive demand surge scenarios (Conservative, Moderate, Aggressive) for Indian festivals like Diwali, Eid, Holi',
    parameters: z.object({
      festivalId: z.string().default('diwali')
    }),
    requiredRoles: ['owner', 'manager'],
    execute: async (context, params) => {
      return festivalService.getFestivalScenarios(context.shopId, params.festivalId || 'diwali');
    }
  },

  resolve_local_alias: {
    name: 'resolve_local_alias',
    description: 'Resolve colloquial local language or messy handwritten product names into canonical inventory products',
    parameters: z.object({
      query: z.string().min(1)
    }),
    execute: async (context, params) => {
      return productAliasService.resolveAlias(context.shopId, params.query);
    }
  },

  compare_suppliers: {
    name: 'compare_suppliers',
    description: 'Compare recorded supplier quotations and lead times for a given product',
    parameters: z.object({
      productId: z.string().min(1)
    }),
    requiredRoles: ['owner', 'manager'],
    execute: async (context, params) => {
      return supplierService.compareQuotesForProduct(context.shopId, params.productId);
    }
  },

  create_purchase_order_draft: {
    name: 'create_purchase_order_draft',
    description: 'Create a draft purchase order for a supplier with requested product quantities. Note: Remains in DRAFT status until human owner approves it.',
    parameters: z.object({
      supplierId: z.string().min(1),
      items: z.array(
        z.object({
          productId: z.string().min(1),
          requestedQty: z.number().int().positive(),
          unitPrice: z.number().min(0)
        })
      ).min(1)
    }),
    requiredRoles: ['owner', 'manager'],
    execute: async (context, params) => {
      return purchasingService.createDraft(context.shopId, context.userId, params);
    }
  },

  get_purchase_order: {
    name: 'get_purchase_order',
    description: 'Retrieve details and approval status of a purchase order by ID',
    parameters: z.object({
      purchaseOrderId: z.string().min(1)
    }),
    execute: async (context, params) => {
      return purchasingService.getPO(context.shopId, params.purchaseOrderId);
    }
  }
};
