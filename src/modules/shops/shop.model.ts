import mongoose, { Schema, Document } from 'mongoose';

export interface IShopSettings {
  defaultLeadTimeDays: number;
  defaultSafetyCoverDays: number;
  lowStockThresholdDefault: number;
}

export interface IShop extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  ownerId: mongoose.Types.ObjectId;
  address?: string;
  timezone: string;
  defaultCurrency: string;
  settings: IShopSettings;
  createdAt: Date;
  updatedAt: Date;
}

const ShopSchema = new Schema<IShop>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    address: { type: String, trim: true },
    timezone: { type: String, default: 'Asia/Kolkata' },
    defaultCurrency: { type: String, default: 'INR' },
    settings: {
      defaultLeadTimeDays: { type: Number, default: 3 },
      defaultSafetyCoverDays: { type: Number, default: 7 },
      lowStockThresholdDefault: { type: Number, default: 10 }
    }
  },
  { timestamps: true }
);

export const Shop = mongoose.model<IShop>('Shop', ShopSchema);
