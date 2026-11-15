import mongoose, { Schema, Document } from 'mongoose';

export interface IProductAlias extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  aliasText: string;
  normalizedAlias: string;
  language: string;
  source: 'manual' | 'voice' | 'invoice' | 'system';
  isConfirmed: boolean;
  confidenceScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductAliasSchema = new Schema<IProductAlias>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    aliasText: { type: String, required: true, trim: true },
    normalizedAlias: { type: String, required: true, trim: true, lowercase: true },
    language: { type: String, default: 'hinglish', trim: true },
    source: {
      type: String,
      enum: ['manual', 'voice', 'invoice', 'system'],
      default: 'manual'
    },
    isConfirmed: { type: Boolean, default: true },
    confidenceScore: { type: Number, default: 1.0, min: 0, max: 1 }
  },
  { timestamps: true }
);

ProductAliasSchema.index({ shopId: 1, normalizedAlias: 1 }, { unique: true });
ProductAliasSchema.index({ shopId: 1, productId: 1 });

export const ProductAlias = mongoose.model<IProductAlias>('ProductAlias', ProductAliasSchema);
