import mongoose, { Schema, Document } from 'mongoose';

export type POStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'PLACED_MANUALLY'
  | 'PARTIALLY_RECEIVED'
  | 'RECEIVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface IPOLineItem {
  productId: mongoose.Types.ObjectId;
  requestedQty: number;
  unitPrice: number;
  receivedQty: number;
}

export interface IPurchaseOrder extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  orderNumber: string;
  supplierId: mongoose.Types.ObjectId;
  status: POStatus;
  items: IPOLineItem[];
  totalCost: number;
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const POLineItemSchema = new Schema<IPOLineItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    receivedQty: { type: Number, default: 0, min: 0 }
  },
  { _id: false }
);

const PurchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    orderNumber: { type: String, required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'PLACED_MANUALLY',
        'PARTIALLY_RECEIVED',
        'RECEIVED',
        'REJECTED',
        'CANCELLED'
      ],
      default: 'DRAFT'
    },
    items: { type: [POLineItemSchema], required: true },
    totalCost: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    version: { type: Number, default: 1 }
  },
  { timestamps: true }
);

PurchaseOrderSchema.index({ shopId: 1, status: 1 });
PurchaseOrderSchema.index({ shopId: 1, orderNumber: 1 }, { unique: true });

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);
