import mongoose, { Schema, Document } from 'mongoose';

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ISale extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: ISaleItem[];
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CREDIT';
  actorId: mongoose.Types.ObjectId;
  source: 'POS' | 'VOICE' | 'SYNC';
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SaleItemSchema = new Schema<ISaleItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot' },
    quantity: { type: Number, required: true, min: 0.001 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const SaleSchema = new Schema<ISale>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    invoiceNumber: { type: String, required: true },
    items: { type: [SaleItemSchema], required: true },
    totalAmount: { type: Number, required: true, min: 0 },
    paymentMethod: { type: String, enum: ['CASH', 'UPI', 'CREDIT'], default: 'CASH' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    source: { type: String, enum: ['POS', 'VOICE', 'SYNC'], default: 'POS' },
    idempotencyKey: { type: String, index: true }
  },
  { timestamps: true }
);

SaleSchema.index({ shopId: 1, createdAt: -1 });

export const Sale = mongoose.model<ISale>('Sale', SaleSchema);
