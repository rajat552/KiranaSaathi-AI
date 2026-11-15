import mongoose, { Schema, Document } from 'mongoose';

export interface IDepletionLine {
  productId: mongoose.Types.ObjectId;
  quantity: number;
  unitCost: number;
  sellingPrice: number;
  rawText?: string;
}

export interface IDepletionObservation extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  recordedBy: mongoose.Types.ObjectId;
  observationDate: Date;
  rawTranscription?: string;
  source: 'voice' | 'text' | 'manual';
  items: IDepletionLine[];
  totalUnits: number;
  totalEstimatedRevenue: number;
  movementIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DepletionLineSchema = new Schema<IDepletionLine>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    rawText: { type: String, trim: true }
  },
  { _id: false }
);

const DepletionObservationSchema = new Schema<IDepletionObservation>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    observationDate: { type: Date, default: Date.now, index: true },
    rawTranscription: { type: String, trim: true },
    source: { type: String, enum: ['voice', 'text', 'manual'], default: 'text' },
    items: [DepletionLineSchema],
    totalUnits: { type: Number, required: true, default: 0 },
    totalEstimatedRevenue: { type: Number, required: true, default: 0 },
    movementIds: [{ type: Schema.Types.ObjectId, ref: 'InventoryMovement' }]
  },
  { timestamps: true }
);

DepletionObservationSchema.index({ shopId: 1, observationDate: -1 });

export const DepletionObservation = mongoose.model<IDepletionObservation>(
  'DepletionObservation',
  DepletionObservationSchema
);
