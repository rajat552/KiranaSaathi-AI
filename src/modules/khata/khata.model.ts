import mongoose, { Schema, Document } from 'mongoose';

export interface IKhataEntry {
  entryId: string;
  type: 'CREDIT_GIVEN' | 'PAYMENT_COLLECTED';
  amount: number;
  notes?: string;
  saleId?: mongoose.Types.ObjectId;
  paymentMode?: 'CASH' | 'UPI';
  actorId: mongoose.Types.ObjectId;
  createdAt: Date;
}

export interface IKhataCustomer extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  customerName: string;
  phoneNumber?: string;
  address?: string;
  creditLimit: number;
  currentBalance: number; // positive = customer owes shop money
  lastTransactionAt?: Date;
  status: 'ACTIVE' | 'SETTLED' | 'BLOCKED';
  entries: IKhataEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const KhataEntrySchema = new Schema<IKhataEntry>(
  {
    entryId: { type: String, required: true },
    type: { type: String, enum: ['CREDIT_GIVEN', 'PAYMENT_COLLECTED'], required: true },
    amount: { type: Number, required: true, min: 0.01 },
    notes: { type: String, trim: true },
    saleId: { type: Schema.Types.ObjectId, ref: 'Sale' },
    paymentMode: { type: String, enum: ['CASH', 'UPI'], default: 'CASH' },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const KhataCustomerSchema = new Schema<IKhataCustomer>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    creditLimit: { type: Number, default: 5000, min: 0 },
    currentBalance: { type: Number, default: 0 },
    lastTransactionAt: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'SETTLED', 'BLOCKED'], default: 'ACTIVE' },
    entries: [KhataEntrySchema]
  },
  { timestamps: true }
);

KhataCustomerSchema.index({ shopId: 1, customerName: 1 });
KhataCustomerSchema.index({ shopId: 1, phoneNumber: 1 });

export const KhataCustomer = mongoose.model<IKhataCustomer>('KhataCustomer', KhataCustomerSchema);
