import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  leadTimeDays: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    leadTimeDays: { type: Number, default: 3, min: 1 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

SupplierSchema.index({ shopId: 1, name: 1 });

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);
