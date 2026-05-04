import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  premium: boolean;
  premiumUntil: Date | null;
  primaryArchetype: string | null;
  vibeCount: number;
  createdAt: Date;
  comparePassword(plain: string): Promise<boolean>;
  toSafeJSON(): SafeUser;
}

export interface SafeUser {
  id: string;
  email: string;
  username: string;
  premium: boolean;
  premiumUntil: string | null;
  primaryArchetype: string | null;
  vibeCount: number;
  createdAt: string;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    premium: { type: Boolean, default: false },
    premiumUntil: { type: Date, default: null },
    primaryArchetype: { type: String, default: null },
    vibeCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

UserSchema.methods.comparePassword = async function (plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toSafeJSON = function (): SafeUser {
  return {
    id: this._id.toString(),
    email: this.email,
    username: this.username,
    premium: this.premium,
    premiumUntil: this.premiumUntil ? this.premiumUntil.toISOString() : null,
    primaryArchetype: this.primaryArchetype,
    vibeCount: this.vibeCount,
    createdAt: this.createdAt.toISOString(),
  };
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
