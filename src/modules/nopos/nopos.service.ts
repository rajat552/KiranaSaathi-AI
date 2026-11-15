import mongoose from 'mongoose';
import { StockSnapshot, IStockSnapshot } from './stock-snapshot.model.js';
import { DepletionObservation, IDepletionObservation } from './depletion-observation.model.js';
import { InvoiceIngestion, IInvoiceIngestion } from './invoice-ingestion.model.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { Product } from '../products/product.model.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { productAliasService } from '../products/product-alias.service.js';
import { AppError } from '../../common/errors/app-error.js';

export class NoPosService {
  /**
   * Periodic shelf snapshot: audits physical stock and adjusts inventory balance with an immutable AUDIT_ADJUSTMENT entry
   */
  async recordSnapshot(
    shopId: string,
    actorId: string,
    items: Array<{ productId: string; countedQty: number }>,
    notes?: string
  ): Promise<IStockSnapshot> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);

    const snapshotItems = [];
    let totalVarianceValue = 0;

    for (const item of items) {
      const prodObjectId = new mongoose.Types.ObjectId(item.productId);
      const product = await Product.findOne({ _id: prodObjectId, shopId: shopObjectId });
      if (!product) throw AppError.notFound(`Product ${item.productId} not found in this shop`);

      const balance = await StockBalance.findOne({ shopId: shopObjectId, productId: prodObjectId });
      const currentOnHand = balance ? balance.onHandQty : 0;
      const variance = item.countedQty - currentOnHand;

      let movementId: mongoose.Types.ObjectId | undefined;

      if (variance !== 0) {
        // Record adjustment movement
        const recordResult = await inventoryService.recordMovement({
          shopId,
          productId: item.productId,
          movementType: 'manual_adjustment',
          quantityDelta: variance, // can be positive or negative
          unitCost: product.costPrice,
          actorId,
          referenceType: 'audit',
          reason: notes || `Shelf snapshot count: ${item.countedQty} (was ${currentOnHand})`
        });
        movementId = recordResult.movement._id;
        totalVarianceValue += variance * product.costPrice;
      }

      snapshotItems.push({
        productId: prodObjectId,
        countedQty: item.countedQty,
        expectedQty: currentOnHand,
        varianceQty: variance,
        unitCost: product.costPrice,
        reconciliationMovementId: movementId
      });
    }

    const snapshot = new StockSnapshot({
      shopId: shopObjectId,
      performedBy: actorObjectId,
      notes,
      items: snapshotItems,
      totalVarianceValue,
      status: 'applied',
      appliedAt: new Date()
    });

    await snapshot.save();
    return snapshot;
  }

  /**
   * Daily depletion observation: records informal/voice/text daily sales without scanning
   */
  async recordDepletion(
    shopId: string,
    actorId: string,
    data: {
      items: Array<{ productId?: string; rawText?: string; quantity: number }>;
      rawTranscription?: string;
      source?: 'voice' | 'text' | 'manual';
      observationDate?: Date;
    }
  ): Promise<IDepletionObservation> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);

    const depletionLines = [];
    const movementIds: mongoose.Types.ObjectId[] = [];
    let totalUnits = 0;
    let totalEstimatedRevenue = 0;

    for (const item of data.items) {
      let resolvedProdId = item.productId;
      if (!resolvedProdId && item.rawText) {
        const resolution = await productAliasService.resolveAlias(shopId, item.rawText);
        if (resolution.resolved && resolution.productId) {
          resolvedProdId = resolution.productId;
        }
      }

      if (!resolvedProdId) {
        throw AppError.badRequest(`Could not identify product from: "${item.rawText || 'unknown'}"`);
      }

      const product = await Product.findOne({
        _id: new mongoose.Types.ObjectId(resolvedProdId),
        shopId: shopObjectId
      });
      if (!product) throw AppError.notFound(`Product ${resolvedProdId} not found`);

      // Verify on-hand stock is sufficient
      const balance = await StockBalance.findOne({
        shopId: shopObjectId,
        productId: product._id
      });
      const available = balance ? balance.onHandQty : 0;
      if (available < item.quantity) {
        throw AppError.badRequest(
          `Insufficient stock for "${product.name}". Available: ${available}, Depleted: ${item.quantity}`
        );
      }

      // Record negative movement
      const recordResult = await inventoryService.recordMovement({
        shopId,
        productId: product._id.toString(),
        movementType: 'sale',
        quantityDelta: -item.quantity,
        unitCost: product.costPrice,
        actorId,
        referenceType: 'sale',
        reason: data.rawTranscription
          ? `No-POS depletion: "${data.rawTranscription}"`
          : 'Daily depletion observation'
      });

      movementIds.push(recordResult.movement._id);
      totalUnits += item.quantity;
      totalEstimatedRevenue += item.quantity * product.sellingPrice;

      depletionLines.push({
        productId: product._id,
        quantity: item.quantity,
        unitCost: product.costPrice,
        sellingPrice: product.sellingPrice,
        rawText: item.rawText
      });
    }

    const observation = new DepletionObservation({
      shopId: shopObjectId,
      recordedBy: actorObjectId,
      observationDate: data.observationDate || new Date(),
      rawTranscription: data.rawTranscription,
      source: data.source || 'text',
      items: depletionLines,
      totalUnits,
      totalEstimatedRevenue,
      movementIds
    });

    await observation.save();
    return observation;
  }

  /**
   * Ingest invoice into review queue
   */
  async ingestInvoice(
    shopId: string,
    actorId: string,
    data: {
      supplierId?: string;
      invoiceNumber?: string;
      invoiceDate?: Date;
      rawText?: string;
      lines: Array<{
        rawDescription: string;
        quantity: number;
        unitCost: number;
        batchCode?: string;
        expiryDate?: Date;
      }>;
    }
  ): Promise<IInvoiceIngestion> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);

    let totalAmount = 0;
    const lineItems = [];

    for (const line of data.lines) {
      const lineCost = line.quantity * line.unitCost;
      totalAmount += lineCost;

      const resolution = await productAliasService.resolveAlias(shopId, line.rawDescription);

      lineItems.push({
        rawDescription: line.rawDescription,
        matchedProductId: resolution.resolved && resolution.productId
          ? new mongoose.Types.ObjectId(resolution.productId)
          : undefined,
        confidence: resolution.confidence || 0,
        quantity: line.quantity,
        unitCost: line.unitCost,
        totalCost: lineCost,
        batchCode: line.batchCode,
        expiryDate: line.expiryDate,
        status: resolution.resolved && resolution.confidence >= 0.85 ? ('verified' as const) : ('pending' as const)
      });
    }

    const invoice = new InvoiceIngestion({
      shopId: shopObjectId,
      uploadedBy: actorObjectId,
      supplierId: data.supplierId ? new mongoose.Types.ObjectId(data.supplierId) : undefined,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate || new Date(),
      rawText: data.rawText,
      lineItems,
      totalAmount,
      status: 'PENDING_REVIEW'
    });

    await invoice.save();
    return invoice;
  }

  /**
   * Verify individual invoice line item
   */
  async verifyInvoiceLine(
    shopId: string,
    invoiceId: string,
    lineId: string,
    data: {
      matchedProductId: string;
      quantity?: number;
      unitCost?: number;
      batchCode?: string;
      expiryDate?: Date;
      status?: 'verified' | 'rejected';
    }
  ) {
    const invoice = await InvoiceIngestion.findOne({
      _id: new mongoose.Types.ObjectId(invoiceId),
      shopId: new mongoose.Types.ObjectId(shopId)
    });
    if (!invoice) throw AppError.notFound('Invoice not found');
    if (invoice.status === 'COMMITTED') {
      throw AppError.badRequest('Cannot edit already committed invoice');
    }

    const line = invoice.lineItems.find((l: any) => l._id.toString() === lineId);
    if (!line) throw AppError.notFound('Line item not found');

    if (data.matchedProductId) {
      line.matchedProductId = new mongoose.Types.ObjectId(data.matchedProductId);
      line.confidence = 1.0;
    }
    if (data.quantity !== undefined) line.quantity = data.quantity;
    if (data.unitCost !== undefined) line.unitCost = data.unitCost;
    line.totalCost = line.quantity * line.unitCost;
    if (data.batchCode !== undefined) line.batchCode = data.batchCode;
    if (data.expiryDate !== undefined) line.expiryDate = data.expiryDate;
    line.status = data.status || 'verified';

    // Recalculate invoice total
    invoice.totalAmount = invoice.lineItems
      .filter((l) => l.status !== 'rejected')
      .reduce((sum, l) => sum + l.totalCost, 0);

    // If all lines verified/rejected, mark invoice VERIFIED
    const hasPending = invoice.lineItems.some((l) => l.status === 'pending');
    invoice.status = hasPending ? 'PENDING_REVIEW' : 'VERIFIED';

    await invoice.save();
    return invoice;
  }

  /**
   * Commit verified invoice to inventory ledger
   */
  async commitInvoice(shopId: string, actorId: string, invoiceId: string): Promise<IInvoiceIngestion> {
    const invoice = await InvoiceIngestion.findOne({
      _id: new mongoose.Types.ObjectId(invoiceId),
      shopId: new mongoose.Types.ObjectId(shopId)
    });
    if (!invoice) throw AppError.notFound('Invoice not found');
    if (invoice.status === 'COMMITTED') {
      throw AppError.conflict('Invoice has already been committed to inventory');
    }

    const pendingLines = invoice.lineItems.filter((l) => l.status === 'pending');
    if (pendingLines.length > 0) {
      throw AppError.badRequest(
        `Cannot commit invoice: ${pendingLines.length} item(s) are still pending human verification`
      );
    }

    const verifiedLines = invoice.lineItems.filter((l) => l.status === 'verified');
    if (verifiedLines.length === 0) {
      throw AppError.badRequest('Cannot commit invoice with 0 verified items');
    }

    const receiptMovementIds: mongoose.Types.ObjectId[] = [];

    for (const line of verifiedLines) {
      if (!line.matchedProductId) {
        throw AppError.badRequest(`Verified line "${line.rawDescription}" lacks a matched product ID`);
      }

      // Record immutable ledger movement
      const recordResult = await inventoryService.recordMovement({
        shopId,
        productId: line.matchedProductId.toString(),
        movementType: 'purchase_receipt',
        quantityDelta: line.quantity,
        unitCost: line.unitCost,
        actorId,
        referenceId: invoice._id.toString(),
        referenceType: 'invoice',
        reason: `Invoice ingestion #${invoice.invoiceNumber || invoice._id}`
      });

      receiptMovementIds.push(recordResult.movement._id);
    }

    invoice.status = 'COMMITTED';
    invoice.committedAt = new Date();
    invoice.committedBy = new mongoose.Types.ObjectId(actorId);
    invoice.receiptMovementIds = receiptMovementIds;

    await invoice.save();
    return invoice;
  }

  async getInvoices(shopId: string, status?: string) {
    const filter: Record<string, unknown> = { shopId: new mongoose.Types.ObjectId(shopId) };
    if (status) filter.status = status;
    return InvoiceIngestion.find(filter).sort({ createdAt: -1 });
  }

  async getSnapshots(shopId: string) {
    return StockSnapshot.find({ shopId: new mongoose.Types.ObjectId(shopId) })
      .populate('items.productId', 'name unit')
      .sort({ createdAt: -1 });
  }

  async getDepletions(shopId: string) {
    return DepletionObservation.find({ shopId: new mongoose.Types.ObjectId(shopId) })
      .populate('items.productId', 'name unit')
      .sort({ createdAt: -1 });
  }
}

export const noPosService = new NoPosService();
