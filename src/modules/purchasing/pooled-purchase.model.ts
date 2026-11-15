import mongoose, { Schema, Document } from 'mongoose';

export interface IShopPoolCommitment {
  shopId: mongoose.Types.ObjectId;
  ownerId: mongoose.Types.ObjectId;
  requestedQty: number;
  approved: boolean;
  approvedAt?: Date;
}

export interface IPooledPurchaseProposal extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  category: string;
  productDescription: string;
  regularPrice: number;
  bulkDiscountPrice: number;
  minimumTargetQty: number;
  totalCommittedQty: number;
  status: 'OPEN' | 'TARGET_REACHED' | 'EXPIRED' | 'COMPLETED';
  expiresAt: Date;
  participatingShops: IShopPoolCommitment[];
  createdByShopId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShopPoolCommitmentSchema = new Schema<IShopPoolCommitment>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    requestedQty: { type: Number, required: true, min: 1 },
    approved: { type: Boolean, default: false },
    approvedAt: { type: Date }
  },
  { _id: false }
);

const PooledPurchaseProposalSchema = new Schema<IPooledPurchaseProposal>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    productDescription: { type: String, required: true, trim: true },
    regularPrice: { type: Number, required: true, min: 0 },
    bulkDiscountPrice: { type: Number, required: true, min: 0 },
    minimumTargetQty: { type: Number, required: true, min: 1 },
    totalCommittedQty: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['OPEN', 'TARGET_REACHED', 'EXPIRED', 'COMPLETED'],
      default: 'OPEN',
      index: true
    },
    expiresAt: { type: Date, required: true },
    participatingShops: [ShopPoolCommitmentSchema],
    createdByShopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true }
  },
  { timestamps: true }
);

export const PooledPurchaseProposal = mongoose.model<IPooledPurchaseProposal>(
  'PooledPurchaseProposal',
  PooledPurchaseProposalSchema
);
