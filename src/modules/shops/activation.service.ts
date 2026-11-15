import mongoose from 'mongoose';
import { Product } from '../products/product.model.js';
import { StockSnapshot } from '../nopos/stock-snapshot.model.js';
import { DepletionObservation } from '../nopos/depletion-observation.model.js';
import { InvoiceIngestion } from '../nopos/invoice-ingestion.model.js';
import { PurchaseOrder } from '../purchasing/purchase-order.model.js';

export interface ActivationMilestone {
  id: string;
  dayTarget: number;
  title: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  actionRequired: string;
}

export interface ActivationStatusResult {
  shopId: string;
  isFullyActivated: boolean;
  completionRate: number; // 0 to 100
  completedMilestonesCount: number;
  totalMilestonesCount: number;
  milestones: ActivationMilestone[];
  nextRecommendedStep: string;
}

export class ActivationService {
  async getShopActivationStatus(shopId: string): Promise<ActivationStatusResult> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const [productCount, snapshotCount, depletionCount, invoiceCount, poCount] =
      await Promise.all([
        Product.countDocuments({ shopId: shopObjectId, status: 'active' }),
        StockSnapshot.countDocuments({ shopId: shopObjectId }),
        DepletionObservation.countDocuments({ shopId: shopObjectId }),
        InvoiceIngestion.countDocuments({ shopId: shopObjectId }),
        PurchaseOrder.countDocuments({ shopId: shopObjectId })
      ]);

    const milestones: ActivationMilestone[] = [
      {
        id: 'DAY_0_STAPLES',
        dayTarget: 0,
        title: 'Top Staples Catalogue Setup',
        description: 'Add your top fast-moving staples (Atta, Dal, Oil, Salt, Sugar, Milk).',
        completed: productCount >= 5,
        actionRequired: productCount >= 5 ? 'Done' : `Add at least ${5 - productCount} more staple products.`
      },
      {
        id: 'DAY_1_SHELF_AUDIT',
        dayTarget: 1,
        title: 'First Shelf Stock Snapshot',
        description: 'Perform your first quick physical count to establish accurate shelf baselines.',
        completed: snapshotCount > 0,
        actionRequired: snapshotCount > 0 ? 'Done' : 'Record a quick shelf snapshot count for 3 staples.'
      },
      {
        id: 'DAY_3_INVOICE_DEPLETION',
        dayTarget: 3,
        title: 'Distributor Invoice or Voice Depletion',
        description: 'Ingest a supplier bill or log a daily voice depletion note.',
        completed: invoiceCount > 0 || depletionCount > 0,
        actionRequired:
          invoiceCount > 0 || depletionCount > 0
            ? 'Done'
            : 'Ingest a paper invoice or record daily voice depletions.'
      },
      {
        id: 'DAY_7_BUDGET_REPLENISHMENT',
        dayTarget: 7,
        title: 'Budget-Safe Purchase Replenishment',
        description: 'Generate and review your first cash-constrained purchase order draft.',
        completed: poCount > 0,
        actionRequired: poCount > 0 ? 'Done' : 'Create your first reorder draft under your cash budget.'
      }
    ];

    const completedMilestonesCount = milestones.filter(m => m.completed).length;
    const totalMilestonesCount = milestones.length;
    const completionRate = Math.round((completedMilestonesCount / totalMilestonesCount) * 100);
    const isFullyActivated = completedMilestonesCount === totalMilestonesCount;

    const pendingMilestone = milestones.find(m => !m.completed);
    const nextRecommendedStep = pendingMilestone
      ? `Step: ${pendingMilestone.title} — ${pendingMilestone.actionRequired}`
      : 'Congratulations! Your Kirana is fully activated on KiranaSaathi AI.';

    return {
      shopId,
      isFullyActivated,
      completionRate,
      completedMilestonesCount,
      totalMilestonesCount,
      milestones,
      nextRecommendedStep
    };
  }
}

export const activationService = new ActivationService();
