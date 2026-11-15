import mongoose, { Schema, Document } from 'mongoose';

export interface ISnapshotItem {
  productId: mongoose.Types.ObjectId;
  countedQty: number;
  expectedQty: number;
  varianceQty: number; // countedQty - expectedQty
  unitCost: number;
  reconciliationMovementId?: mongoose.Types.ObjectId;
}

export interface IStockSnapshot extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;
  notes?: string;
  items: ISnapshotItem[];
  totalVarianceValue: number;
  status: 'draft' | 'applied';
  appliedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SnapshotItemSchema = new Schema<ISnapshotItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    countedQty: { type: Number, required: true, min: 0 },
    expectedQty: { type: Number, required: true },
    varianceQty: { type: Number, required: true },
    unitCost: { type: Number, required: true, default: 0 },
    reconciliationMovementId: { type: Schema.Types.ObjectId, ref: 'InventoryMovement' }
  },
  { _id: false }
);

const StockSnapshotSchema = new Schema<IStockSnapshot>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    notes: { type: String, trim: true },
    items: [SnapshotItemSchema],
    totalVarianceValue: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'applied'], default: 'draft' },
    appliedAt: { type: Date }
  },
  { timestamps: true }
);

StockSnapshotSchema.index({ shopId: 1, createdAt: -1 });

export const StockSnapshot = mongoose.model<IStockSnapshot>('StockSnapshot', StockSnapshotSchema);
