import mongoose, { Schema, Document } from 'mongoose';

export interface IIdempotencyRecord extends Document {
  shopId: mongoose.Types.ObjectId;
  key: string;
  requestHash: string;
  status: 'processing' | 'completed' | 'failed';
  statusCode?: number;
  responseBody?: any;
  createdAt: Date;
  expiresAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    key: { type: String, required: true },
    requestHash: { type: String, required: true },
    status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
    statusCode: { type: Number },
    responseBody: { type: Schema.Types.Mixed },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }
  },
  { timestamps: true }
);

IdempotencyRecordSchema.index({ shopId: 1, key: 1 }, { unique: true });

export const IdempotencyRecord = mongoose.model<IIdempotencyRecord>(
  'IdempotencyRecord',
  IdempotencyRecordSchema
);
