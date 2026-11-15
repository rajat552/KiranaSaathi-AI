import mongoose, { Schema, Document } from 'mongoose';

export type ProductUnit = 'PCS' | 'KG' | 'G' | 'L' | 'ML' | 'PACK' | 'BOX';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  name: string;
  brand?: string;
  sku?: string;
  barcode?: string;
  category: string;
  unit: ProductUnit;
  costPrice: number;
  sellingPrice: number;
  reorderPoint: number;
  targetCoverDays: number;
  expiryTracked: boolean;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    sku: { type: String, trim: true },
    barcode: { type: String, trim: true },
    category: { type: String, required: true, trim: true },
    unit: {
      type: String,
      enum: ['PCS', 'KG', 'G', 'L', 'ML', 'PACK', 'BOX'],
      default: 'PCS'
    },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    reorderPoint: { type: Number, default: 10, min: 0 },
    targetCoverDays: { type: Number, default: 7, min: 1 },
    expiryTracked: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'archived'], default: 'active' }
  },
  { timestamps: true }
);

ProductSchema.index(
  { shopId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } }
);
ProductSchema.index(
  { shopId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } }
);
ProductSchema.index({ shopId: 1, name: 1 });
ProductSchema.index({ shopId: 1, category: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
