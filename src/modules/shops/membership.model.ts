import mongoose, { Schema, Document } from 'mongoose';
import { Role } from '../../common/types/index.js';

export interface IMembership extends Document {
  _id: mongoose.Types.ObjectId;
  shopId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: Role;
  status: 'active' | 'invited' | 'deactivated';
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<IMembership>(
  {
    shopId: { type: Schema.Types.ObjectId, ref: 'Shop', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'manager', 'staff'], required: true },
    status: { type: String, enum: ['active', 'invited', 'deactivated'], default: 'active' }
  },
  { timestamps: true }
);

MembershipSchema.index({ shopId: 1, userId: 1 }, { unique: true });

export const Membership = mongoose.model<IMembership>('Membership', MembershipSchema);
