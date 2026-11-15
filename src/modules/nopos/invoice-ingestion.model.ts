import mongoose, { Schema, Document } from 'mongoose';

export interface IInvoiceLineItem {
  rawDescription: string;
  matchedProductId?: mongoose.Types.ObjectId;
  confidence: number;
  quantity: number;
  unitCost: number;
  totalCost: number;
  batchCode?: string;
  expiryDate?: Date;
  status: 'pending' | 'verified' | 'rejected';
}

export interface IInvoiceIngestion extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  uploadedBy: mongoose.Types.ObjectId;
  supplierId?: mongoose.Types.ObjectId;
  invoiceNumber?: string;
  invoiceDate?: Date;
  rawText?: string;
  lineItems: IInvoiceLineItem[];
  totalAmount: number;
  status: 'PENDING_REVIEW' | 'VERIFIED' | 'COMMITTED' | 'REJECTED';
  committedAt?: Date;
  committedBy?: mongoose.Types.ObjectId;
  receiptMovementIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    rawDescription: { type: String, required: true, trim: true },
    matchedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
    confidence: { type: Number, default: 0, min: 0, max: 1 },
    quantity: { type: Number, required: true, min: 0.01 },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    batchCode: { type: String, trim: true },
    expiryDate: { type: Date },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' }
  },
  { _id: true }
);

const InvoiceIngestionSchema = new Schema<IInvoiceIngestion>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    invoiceNumber: { type: String, trim: true },
    invoiceDate: { type: Date },
    rawText: { type: String },
    lineItems: [InvoiceLineItemSchema],
    totalAmount: { type: Number, required: true, default: 0 },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'VERIFIED', 'COMMITTED', 'REJECTED'],
      default: 'PENDING_REVIEW',
      index: true
    },
    committedAt: { type: Date },
    committedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    receiptMovementIds: [{ type: Schema.Types.ObjectId, ref: 'InventoryMovement' }]
  },
  { timestamps: true }
);

InvoiceIngestionSchema.index({ shopId: 1, createdAt: -1 });

export const InvoiceIngestion = mongoose.model<IInvoiceIngestion>(
  'InvoiceIngestion',
  InvoiceIngestionSchema
);
