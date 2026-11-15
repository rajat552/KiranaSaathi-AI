import mongoose, { Schema, Document } from 'mongoose';

export interface IInventoryLot extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  batchCode: string;
  initialQty: number;
  remainingQty: number;
  unitCost: number;
  receivedAt: Date;
  expiryDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryLotSchema = new Schema<IInventoryLot>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    batchCode: { type: String, required: true, trim: true },
    initialQty: { type: Number, required: true, min: 0 },
    remainingQty: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    receivedAt: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

InventoryLotSchema.index({ shopId: 1, productId: 1, expiryDate: 1 });

export const InventoryLot = mongoose.model<IInventoryLot>('InventoryLot', InventoryLotSchema);
