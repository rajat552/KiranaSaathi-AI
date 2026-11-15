import mongoose from 'mongoose';
import { Sale, ISale } from './sale.model.js';
import { CreateSaleInput, ListSalesQuery } from './sale.schema.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { Product } from '../products/product.model.js';
import { AppError } from '../../common/errors/app-error.js';

export class SaleService {
  async recordSale(
    shopId: string,
    actorId: string,
    input: CreateSaleInput,
    idempotencyKey?: string
  ) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);

    // 1. Pre-validate all items and verify product existence and stock availability
    const productIds = input.items.map(item => new mongoose.Types.ObjectId(item.productId));
    const products = await Product.find({ _id: { $in: productIds }, shopId: shopObjectId });

    if (products.length !== input.items.length) {
      throw AppError.badRequest('One or more products in the sale are invalid or belong to another shop');
    }

    const productMap = new Map<string, any>();
    products.forEach(p => productMap.set(p._id.toString(), p));

    const balances = await StockBalance.find({ productId: { $in: productIds }, shopId: shopObjectId });
    const balanceMap = new Map<string, number>();
    balances.forEach(b => balanceMap.set(b.productId.toString(), b.onHandQty));

    const stockValidationErrors: unknown[] = [];
    for (const item of input.items) {
      const p = productMap.get(item.productId);
      const available = balanceMap.get(item.productId) || 0;
      if (available < item.quantity) {
        stockValidationErrors.push({
          productId: item.productId,
          productName: p.name,
          available,
          requested: item.quantity
        });
      }
    }

    if (stockValidationErrors.length > 0) {
      throw AppError.insufficientStock(
        'Cannot complete sale: one or more items exceed current on-hand stock',
        stockValidationErrors
      );
    }

    // 2. Generate Invoice Number
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // 3. Compute item totals
    let totalAmount = 0;
    const processedItems = input.items.map(item => {
      const subtotal = Math.round(item.quantity * item.unitPrice * 100) / 100;
      totalAmount += subtotal;
      return {
        productId: new mongoose.Types.ObjectId(item.productId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal
      };
    });

    totalAmount = Math.round(totalAmount * 100) / 100;

    // 4. Create Sale
    const sale = new Sale({
      shopId: shopObjectId,
      invoiceNumber,
      items: processedItems,
      totalAmount,
      paymentMethod: input.paymentMethod,
      actorId: actorObjectId,
      source: input.source,
      idempotencyKey
    });

    await sale.save();

    // 5. Deduct stock for each line item using FEFO and record ledger movements with rollback protection
    const completedDeductions: { productId: string; quantity: number }[] = [];

    try {
      for (const item of input.items) {
        await inventoryService.deductStockForSale({
          shopId,
          productId: item.productId,
          quantity: item.quantity,
          actorId,
          saleId: sale._id.toString(),
          idempotencyKey: idempotencyKey ? `${idempotencyKey}_item_${item.productId}` : undefined
        });
        completedDeductions.push({ productId: item.productId, quantity: item.quantity });
      }
    } catch (deductionError) {
      // Rollback completed deductions to guarantee all-or-nothing atomicity
      for (const completed of completedDeductions) {
        await inventoryService.recordMovement({
          shopId,
          productId: completed.productId,
          movementType: 'manual_adjustment',
          quantityDelta: completed.quantity,
          actorId,
          reason: `Compensating rollback for aborted sale ${sale.invoiceNumber}`
        }).catch(err => console.error('Failed to rollback deduction item', err));
      }
      await Sale.deleteOne({ _id: sale._id });
      throw deductionError;
    }

    return {
      sale: {
        id: sale._id.toString(),
        invoiceNumber: sale.invoiceNumber,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        itemsCount: sale.items.length,
        source: sale.source,
        createdAt: sale.createdAt
      }
    };
  }

  async listSales(shopId: string, query: ListSalesQuery) {
    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId)
    };

    if (query.startDate || query.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (query.startDate) dateFilter.$gte = new Date(query.startDate);
      if (query.endDate) dateFilter.$lte = new Date(query.endDate);
      filter.createdAt = dateFilter;
    }

    const [sales, total] = await Promise.all([
      Sale.find(filter)
        .sort({ createdAt: -1 })
        .skip(query.skip)
        .limit(query.limit)
        .populate('items.productId', 'name unit')
        .populate('actorId', 'name'),
      Sale.countDocuments(filter)
    ]);

    return {
      sales: sales.map(s => ({
        id: s._id.toString(),
        invoiceNumber: s.invoiceNumber,
        totalAmount: s.totalAmount,
        paymentMethod: s.paymentMethod,
        items: s.items.map(it => ({
          productId: (it.productId as any)?._id?.toString() || it.productId.toString(),
          productName: (it.productId as any)?.name || 'Unknown Product',
          unit: (it.productId as any)?.unit || 'PCS',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          subtotal: it.subtotal
        })),
        cashier: (s.actorId as any)?.name || 'Unknown',
        source: s.source,
        createdAt: s.createdAt
      })),
      total,
      limit: query.limit,
      skip: query.skip
    };
  }
}

export const saleService = new SaleService();
