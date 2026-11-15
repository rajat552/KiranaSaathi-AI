import mongoose from 'mongoose';
import { PurchaseOrder, IPurchaseOrder, POStatus } from './purchase-order.model.js';
import { Supplier } from '../suppliers/supplier.model.js';
import { Product } from '../products/product.model.js';
import { CreatePODraftInput, RejectPOInput, ReceivePOItemsInput } from './purchasing.schema.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AppError } from '../../common/errors/app-error.js';

export class PurchasingService {
  async createDraft(shopId: string, actorId: string, input: CreatePODraftInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const supplierObjectId = new mongoose.Types.ObjectId(input.supplierId);
    const actorObjectId = new mongoose.Types.ObjectId(actorId);

    const supplier = await Supplier.findOne({ _id: supplierObjectId, shopId: shopObjectId });
    if (!supplier) throw AppError.notFound('Supplier not found in this shop');

    const productIds = input.items.map(it => new mongoose.Types.ObjectId(it.productId));
    const products = await Product.find({ _id: { $in: productIds }, shopId: shopObjectId });
    if (products.length !== input.items.length) {
      throw AppError.badRequest('One or more products are invalid or belong to another shop');
    }

    let totalCost = 0;
    const items = input.items.map(it => {
      const subtotal = Math.round(it.requestedQty * it.unitPrice * 100) / 100;
      totalCost += subtotal;
      return {
        productId: new mongoose.Types.ObjectId(it.productId),
        requestedQty: it.requestedQty,
        unitPrice: it.unitPrice,
        receivedQty: 0
      };
    });

    totalCost = Math.round(totalCost * 100) / 100;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PO-${dateStr}-${randomSuffix}`;

    const po = new PurchaseOrder({
      shopId: shopObjectId,
      orderNumber,
      supplierId: supplierObjectId,
      status: 'DRAFT',
      items,
      totalCost,
      createdBy: actorObjectId,
      version: 1
    });

    await po.save();
    return po;
  }

  async getPO(shopId: string, poId: string) {
    const po = await PurchaseOrder.findOne({
      _id: new mongoose.Types.ObjectId(poId),
      shopId: new mongoose.Types.ObjectId(shopId)
    })
      .populate('supplierId', 'name phone email leadTimeDays')
      .populate('items.productId', 'name unit sku')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    if (!po) throw AppError.notFound('Purchase order not found');
    return po;
  }

  async listPOs(shopId: string, status?: POStatus) {
    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId)
    };
    if (status) filter.status = status;

    const pos = await PurchaseOrder.find(filter)
      .sort({ createdAt: -1 })
      .populate('supplierId', 'name')
      .populate('items.productId', 'name unit')
      .populate('createdBy', 'name');

    return pos;
  }

  async approvePO(shopId: string, approverId: string, poId: string, expectedVersion?: number) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const poObjectId = new mongoose.Types.ObjectId(poId);
    const approverObjectId = new mongoose.Types.ObjectId(approverId);

    const po = await PurchaseOrder.findOne({ _id: poObjectId, shopId: shopObjectId });
    if (!po) throw AppError.notFound('Purchase order not found');

    if (po.status !== 'DRAFT' && po.status !== 'PENDING_APPROVAL') {
      throw AppError.badRequest(`Cannot approve purchase order with status ${po.status}`);
    }

    if (expectedVersion !== undefined && po.version !== expectedVersion) {
      throw AppError.conflict('Purchase order draft has changed since last reviewed. Please reload and review the latest version.');
    }

    po.status = 'APPROVED';
    po.approvedBy = approverObjectId;
    po.approvedAt = new Date();
    po.version += 1;

    await po.save();
    return po;
  }

  async rejectPO(shopId: string, approverId: string, poId: string, input: RejectPOInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const poObjectId = new mongoose.Types.ObjectId(poId);

    const po = await PurchaseOrder.findOne({ _id: poObjectId, shopId: shopObjectId });
    if (!po) throw AppError.notFound('Purchase order not found');

    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw AppError.badRequest(`Cannot reject purchase order with status ${po.status}`);
    }

    po.status = 'REJECTED';
    po.rejectionReason = input.reason;
    po.version += 1;

    await po.save();
    return po;
  }

  async markPlacedManually(shopId: string, poId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const poObjectId = new mongoose.Types.ObjectId(poId);

    const po = await PurchaseOrder.findOne({ _id: poObjectId, shopId: shopObjectId });
    if (!po) throw AppError.notFound('Purchase order not found');

    if (po.status !== 'APPROVED') {
      throw AppError.badRequest('Only APPROVED purchase orders can be marked as placed');
    }

    po.status = 'PLACED_MANUALLY';
    await po.save();
    return po;
  }

  async receivePOItems(
    shopId: string,
    actorId: string,
    poId: string,
    input: ReceivePOItemsInput,
    idempotencyKey?: string
  ) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const poObjectId = new mongoose.Types.ObjectId(poId);

    const po = await PurchaseOrder.findOne({ _id: poObjectId, shopId: shopObjectId });
    if (!po) throw AppError.notFound('Purchase order not found');

    if (!['APPROVED', 'PLACED_MANUALLY', 'PARTIALLY_RECEIVED'].includes(po.status)) {
      throw AppError.badRequest(`Cannot receive items for purchase order in status ${po.status}`);
    }

    // Process each received item
    for (const rec of input.receivedItems) {
      const lineItem = po.items.find(it => it.productId.toString() === rec.productId);
      if (!lineItem) {
        throw AppError.badRequest(`Product ${rec.productId} is not part of this purchase order`);
      }

      const pendingQty = lineItem.requestedQty - (lineItem.receivedQty || 0);
      if (rec.quantityReceived > pendingQty) {
        throw AppError.badRequest(
          `Cannot receive ${rec.quantityReceived} units for product ${rec.productId}. Only ${pendingQty} units remain pending on this order.`
        );
      }

      lineItem.receivedQty = (lineItem.receivedQty || 0) + rec.quantityReceived;

      // Create stock movement & update inventory projections
      await inventoryService.recordReceipt(
        shopId,
        actorId,
        {
          productId: rec.productId,
          quantity: rec.quantityReceived,
          unitCost: lineItem.unitPrice,
          batchCode: rec.batchCode,
          expiryDate: rec.expiryDate,
          supplierId: po.supplierId.toString(),
          referenceId: po.orderNumber,
          reason: `Delivery receipt for ${po.orderNumber}`
        },
        idempotencyKey ? `${idempotencyKey}_recv_${rec.productId}` : undefined
      );
    }

    // Evaluate if all items are fully received
    const allFullyReceived = po.items.every(it => it.receivedQty >= it.requestedQty);
    po.status = allFullyReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    po.version += 1;
    await po.save();

    return po;
  }
}

export const purchasingService = new PurchasingService();
