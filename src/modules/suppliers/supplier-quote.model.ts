import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplierQuote extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  price: number;
  minOrderQty: number;
  observedAt: Date;
  notes?: string;
}

const SupplierQuoteSchema = new Schema<ISupplierQuote>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    minOrderQty: { type: Number, default: 1, min: 1 },
    observedAt: { type: Date, default: Date.now },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

SupplierQuoteSchema.index({ shopId: 1, productId: 1, observedAt: -1 });

export const SupplierQuote = mongoose.model<ISupplierQuote>('SupplierQuote', SupplierQuoteSchema);
