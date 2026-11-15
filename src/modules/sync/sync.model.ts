import mongoose, { Schema, Document } from 'mongoose';

export type SyncEventType = 'sale' | 'stock_receipt' | 'adjustment';
export type SyncStatus = 'accepted' | 'duplicate' | 'rejected' | 'conflict';

export interface ISyncEventRecord extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  deviceId: string;
  clientEventId: string;
  eventType: SyncEventType;
  payload: any;
  status: SyncStatus;
  rejectionReason?: string;
  processedAt: Date;
  clientTimestamp: Date;
}

const SyncEventRecordSchema = new Schema<ISyncEventRecord>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    deviceId: { type: String, required: true },
    clientEventId: { type: String, required: true },
    eventType: { type: String, enum: ['sale', 'stock_receipt', 'adjustment'], required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['accepted', 'duplicate', 'rejected', 'conflict'], required: true },
    rejectionReason: { type: String },
    clientTimestamp: { type: Date, required: true },
    processedAt: { type: Date, default: Date.now }
  },
  { timestamps: false }
);

SyncEventRecordSchema.index({ shopId: 1, clientEventId: 1 }, { unique: true });

export const SyncEventRecord = mongoose.model<ISyncEventRecord>('SyncEventRecord', SyncEventRecordSchema);
