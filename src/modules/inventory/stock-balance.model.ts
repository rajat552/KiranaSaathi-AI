import mongoose, { Schema, Document } from 'mongoose';

export interface IStockBalance extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  onHandQty: number;
  reservedQty: number;
  version: number;
  updatedAt: Date;
}

const StockBalanceSchema = new Schema<IStockBalance>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    onHandQty: { type: Number, required: true, default: 0, min: 0 },
    reservedQty: { type: Number, required: true, default: 0, min: 0 },
    version: { type: Number, default: 0 }
  },
  { timestamps: { createdAt: false, updatedAt: true } }
);

StockBalanceSchema.index({ shopId: 1, productId: 1 }, { unique: true });

export const StockBalance = mongoose.model<IStockBalance>('StockBalance', StockBalanceSchema);
