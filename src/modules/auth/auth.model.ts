import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email?: string;
  phone?: string;
  name: string;
  passwordHash: string;
  refreshTokenHash?: string;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
    refreshTokenHash: { type: String },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', UserSchema);
