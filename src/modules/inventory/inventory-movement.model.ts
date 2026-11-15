import mongoose, { Schema, Document } from 'mongoose';

export type MovementType =
  | 'opening_balance'
  | 'sale'
  | 'purchase_receipt'
  | 'customer_return'
  | 'supplier_return'
  | 'wastage'
  | 'manual_adjustment';

export interface IInventoryMovement extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  lotId?: mongoose.Types.ObjectId;
  movementType: MovementType;
  quantityDelta: number; // Signed: positive = stock added, negative = stock reduced
  unitCost: number;
  referenceType: 'sale' | 'purchase_order' | 'manual' | 'sync' | 'invoice' | 'audit';
  referenceId?: string;
  actorId: mongoose.Types.ObjectId;
  reason?: string;
  idempotencyKey?: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    lotId: { type: Schema.Types.ObjectId, ref: 'InventoryLot', default: null },
    movementType: {
      type: String,
      enum: [
        'opening_balance',
        'sale',
        'purchase_receipt',
        'customer_return',
        'supplier_return',
        'wastage',
        'manual_adjustment'
      ],
      required: true
    },
    quantityDelta: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    referenceType: {
      type: String,
      enum: ['sale', 'purchase_order', 'manual', 'sync', 'invoice', 'audit'],
      default: 'manual'
    },
    referenceId: { type: String, default: null },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true },
    idempotencyKey: { type: String, index: true },
    createdAt: { type: Date, default: Date.now, immutable: true }
  },
  { timestamps: false }
);

InventoryMovementSchema.index({ shopId: 1, productId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovement>(
  'InventoryMovement',
  InventoryMovementSchema
);
