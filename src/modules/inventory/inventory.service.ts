import mongoose from 'mongoose';
import { InventoryMovement, MovementType } from './inventory-movement.model.js';
import { StockBalance } from './stock-balance.model.js';
import { InventoryLot } from './inventory-lot.model.js';
import { Product } from '../products/product.model.js';
import { AppError } from '../../common/errors/app-error.js';
import { StockReceiptInput, StockAdjustmentInput, OpeningBalanceInput, ListMovementsQuery } from './inventory.schema.js';
import { logger } from '../../config/logger.js';

export class InventoryService {
  /**
   * Applies an atomic inventory movement and synchronizes the StockBalance projection.
   */
  async recordMovement(params: {
    shopId: string;
    productId: string;
    movementType: MovementType;
    quantityDelta: number;
    unitCost?: number;
    actorId: string;
    referenceType?: 'sale' | 'purchase_order' | 'manual' | 'sync' | 'invoice' | 'audit';
    referenceId?: string;
    reason?: string;
    lotId?: string;
    idempotencyKey?: string;
  }) {
    const shopObjectId = new mongoose.Types.ObjectId(params.shopId);
    const productObjectId = new mongoose.Types.ObjectId(params.productId);
    const actorObjectId = new mongoose.Types.ObjectId(params.actorId);
    const lotObjectId = params.lotId ? new mongoose.Types.ObjectId(params.lotId) : undefined;

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found in this shop');

    // Fetch or initialize current balance
    let balance = await StockBalance.findOne({ shopId: shopObjectId, productId: productObjectId });
    if (!balance) {
      balance = new StockBalance({
        shopId: shopObjectId,
        productId: productObjectId,
        onHandQty: 0,
        reservedQty: 0,
        version: 0
      });
      await balance.save();
    }

    // Guard against negative stock on deduction
    if (params.quantityDelta < 0) {
      const requiredQty = Math.abs(params.quantityDelta);
      if (balance.onHandQty < requiredQty) {
        throw AppError.insufficientStock(
          `Insufficient stock for "${product.name}". Available: ${balance.onHandQty} ${product.unit}, Requested: ${requiredQty} ${product.unit}`,
          [{ productId: params.productId, available: balance.onHandQty, requested: requiredQty }]
        );
      }
    }

    // 1. Create Immutable Movement Record
    const movement = new InventoryMovement({
      shopId: shopObjectId,
      productId: productObjectId,
      lotId: lotObjectId,
      movementType: params.movementType,
      quantityDelta: params.quantityDelta,
      unitCost: params.unitCost ?? product.costPrice,
      referenceType: params.referenceType || 'manual',
      referenceId: params.referenceId,
      actorId: actorObjectId,
      reason: params.reason,
      idempotencyKey: params.idempotencyKey
    });
    await movement.save();

    // 2. Update StockBalance Projection atomically with strict database-level oversell guard
    const balanceFilter: Record<string, unknown> = {
      shopId: shopObjectId,
      productId: productObjectId
    };

    if (params.quantityDelta < 0) {
      // Atomic guard: balance MUST be at least the requested deduction
      balanceFilter.onHandQty = { $gte: Math.abs(params.quantityDelta) };
    }

    const updatedBalance = await StockBalance.findOneAndUpdate(
      balanceFilter,
      {
        $inc: { onHandQty: params.quantityDelta, version: 1 }
      },
      { new: true }
    );

    if (!updatedBalance) {
      // Rollback the movement record if atomic stock deduction failed
      await InventoryMovement.deleteOne({ _id: movement._id });
      throw AppError.insufficientStock(
        `Atomic stock deduction rejected for "${product.name}". Insufficient inventory or concurrent race condition.`
      );
    }

    return { movement, balance: updatedBalance };
  }

  /**
   * Records initial/opening stock for a product.
   */
  async setOpeningBalance(shopId: string, actorId: string, input: OpeningBalanceInput, idempotencyKey?: string) {
    const productObjectId = new mongoose.Types.ObjectId(input.productId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found');

    const existingMovements = await InventoryMovement.countDocuments({
      shopId: shopObjectId,
      productId: productObjectId
    });

    if (existingMovements > 0) {
      throw AppError.badRequest('Opening balance can only be set when no prior movements exist for this product. Use manual adjustment instead.');
    }

    let lotId: string | undefined;
    if (product.expiryTracked && input.expiryDate) {
      const lot = new InventoryLot({
        shopId: shopObjectId,
        productId: productObjectId,
        batchCode: input.batchCode || 'OPENING-BATCH',
        initialQty: input.quantity,
        remainingQty: input.quantity,
        unitCost: input.unitCost || product.costPrice,
        expiryDate: new Date(input.expiryDate)
      });
      await lot.save();
      lotId = lot._id.toString();
    }

    return this.recordMovement({
      shopId,
      productId: input.productId,
      movementType: 'opening_balance',
      quantityDelta: input.quantity,
      unitCost: input.unitCost || product.costPrice,
      actorId,
      lotId,
      reason: 'Opening stock balance entry',
      idempotencyKey
    });
  }

  /**
   * Records receipt of goods (stock delivery).
   */
  async recordReceipt(shopId: string, actorId: string, input: StockReceiptInput, idempotencyKey?: string) {
    const productObjectId = new mongoose.Types.ObjectId(input.productId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found');

    let lotId: string | undefined;
    if (product.expiryTracked && input.expiryDate) {
      const lot = new InventoryLot({
        shopId: shopObjectId,
        productId: productObjectId,
        batchCode: input.batchCode || `LOT-${Date.now()}`,
        initialQty: input.quantity,
        remainingQty: input.quantity,
        unitCost: input.unitCost,
        expiryDate: new Date(input.expiryDate)
      });
      await lot.save();
      lotId = lot._id.toString();
    }

    return this.recordMovement({
      shopId,
      productId: input.productId,
      movementType: 'purchase_receipt',
      quantityDelta: input.quantity,
      unitCost: input.unitCost,
      actorId,
      referenceType: input.referenceId ? 'purchase_order' : 'manual',
      referenceId: input.referenceId,
      reason: input.reason || 'Goods received from supplier',
      lotId,
      idempotencyKey
    });
  }

  /**
   * Records manual adjustment or wastage with mandatory reason.
   */
  async recordAdjustment(shopId: string, actorId: string, input: StockAdjustmentInput, idempotencyKey?: string) {
    let finalDelta = input.quantityDelta;
    if (input.adjustmentType === 'wastage' || input.adjustmentType === 'supplier_return') {
      finalDelta = -Math.abs(input.quantityDelta);
    }

    return this.recordMovement({
      shopId,
      productId: input.productId,
      movementType: input.adjustmentType,
      quantityDelta: finalDelta,
      actorId,
      reason: input.reason,
      lotId: input.lotId,
      idempotencyKey
    });
  }

  /**
   * Deducts quantity for a sale using FEFO (First Expiry, First Out) for expiry-tracked products.
   */
  async deductStockForSale(params: {
    shopId: string;
    productId: string;
    quantity: number;
    actorId: string;
    saleId: string;
    idempotencyKey?: string;
  }) {
    const shopObjectId = new mongoose.Types.ObjectId(params.shopId);
    const productObjectId = new mongoose.Types.ObjectId(params.productId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found');

    let lotAllocations: { lotId?: string; quantity: number }[] = [];

    if (product.expiryTracked) {
      // FEFO: fetch available lots sorted by earliest expiry
      const lots = await InventoryLot.find({
        shopId: shopObjectId,
        productId: productObjectId,
        remainingQty: { $gt: 0 }
      }).sort({ expiryDate: 1 });

      let needed = params.quantity;
      for (const lot of lots) {
        if (needed <= 0) break;
        const deductFromLot = Math.min(lot.remainingQty, needed);
        lot.remainingQty -= deductFromLot;
        await lot.save();
        lotAllocations.push({ lotId: lot._id.toString(), quantity: deductFromLot });
        needed -= deductFromLot;
      }

      if (needed > 0) {
        // If not enough lot quantity exists even though overall stock might be tracked
        lotAllocations.push({ quantity: needed });
      }
    } else {
      lotAllocations = [{ quantity: params.quantity }];
    }

    // Record movement and update stock balance
    const result = await this.recordMovement({
      shopId: params.shopId,
      productId: params.productId,
      movementType: 'sale',
      quantityDelta: -params.quantity,
      actorId: params.actorId,
      referenceType: 'sale',
      referenceId: params.saleId,
      lotId: lotAllocations[0]?.lotId,
      idempotencyKey: params.idempotencyKey
    });

    return { result, lotAllocations };
  }

  /**
   * Retrieves overall inventory summary for the shop.
   */
  async getInventorySummary(shopId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const products = await Product.find({ shopId: shopObjectId, status: 'active' });
    const balances = await StockBalance.find({ shopId: shopObjectId });

    const balanceMap = new Map<string, number>();
    balances.forEach(b => balanceMap.set(b.productId.toString(), b.onHandQty));

    return products.map(p => {
      const onHand = balanceMap.get(p._id.toString()) || 0;
      const isLowStock = onHand <= p.reorderPoint;
      return {
        productId: p._id.toString(),
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        unit: p.unit,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        reorderPoint: p.reorderPoint,
        targetCoverDays: p.targetCoverDays,
        expiryTracked: p.expiryTracked,
        onHandQty: onHand,
        isLowStock,
        stockStatus: onHand === 0 ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'HEALTHY'
      };
    });
  }

  /**
   * Lists inventory movements with filtering and pagination.
   */
  async listMovements(shopId: string, query: ListMovementsQuery) {
    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId)
    };

    if (query.productId) {
      filter.productId = new mongoose.Types.ObjectId(query.productId);
    }
    if (query.movementType) {
      filter.movementType = query.movementType;
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('productId', 'name unit')
        .populate('actorId', 'name'),
      InventoryMovement.countDocuments(filter)
    ]);

    return {
      movements: movements.map(m => ({
        id: m._id.toString(),
        productId: (m.productId as any)?._id?.toString() || m.productId.toString(),
        productName: (m.productId as any)?.name || 'Unknown Product',
        unit: (m.productId as any)?.unit || 'PCS',
        movementType: m.movementType,
        quantityDelta: m.quantityDelta,
        unitCost: m.unitCost,
        referenceType: m.referenceType,
        referenceId: m.referenceId,
        actorName: (m.actorId as any)?.name || 'System',
        reason: m.reason,
        createdAt: m.createdAt
      })),
      total,
      limit: query.limit,
      skip: query.skip
    };
  }

  /**
   * Reconciles current StockBalance projections against the sum of all immutable movements.
   * Identifies discrepancies and automatically resolves them if repair = true.
   */
  async reconcileBalances(shopId: string, repair = false) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    // Aggregate movements grouped by productId
    const movementSums = await InventoryMovement.aggregate([
      { $match: { shopId: shopObjectId } },
      { $group: { _id: '$productId', totalDelta: { $sum: '$quantityDelta' } } }
    ]);

    const movementMap = new Map<string, number>();
    movementSums.forEach(m => movementMap.set(m._id.toString(), m.totalDelta));

    const products = await Product.find({ shopId: shopObjectId });
    const balances = await StockBalance.find({ shopId: shopObjectId });

    const balanceMap = new Map<string, any>();
    balances.forEach(b => balanceMap.set(b.productId.toString(), b));

    const discrepancies: {
      productId: string;
      productName: string;
      projectedOnHand: number;
      ledgerSum: number;
      difference: number;
      repaired: boolean;
    }[] = [];

    for (const product of products) {
      const pid = product._id.toString();
      const currentBalance = balanceMap.get(pid);
      const projected = currentBalance ? currentBalance.onHandQty : 0;
      const ledgerSum = movementMap.get(pid) || 0;

      if (projected !== ledgerSum) {
        let repaired = false;
        if (repair) {
          await StockBalance.findOneAndUpdate(
            { shopId: shopObjectId, productId: product._id },
            { $set: { onHandQty: Math.max(0, ledgerSum) }, $inc: { version: 1 } },
            { upsert: true }
          );
          repaired = true;
        }

        discrepancies.push({
          productId: pid,
          productName: product.name,
          projectedOnHand: projected,
          ledgerSum,
          difference: projected - ledgerSum,
          repaired
        });
      }
    }

    return {
      reconciledAt: new Date().toISOString(),
      productsChecked: products.length,
      discrepancyCount: discrepancies.length,
      isConsistent: discrepancies.length === 0,
      discrepancies
    };
  }
}

export const inventoryService = new InventoryService();
