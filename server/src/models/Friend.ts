import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IFriend extends Document {
  // canonical pair: a < b lexicographically (toString())
  a: Types.ObjectId;
  b: Types.ObjectId;
  createdAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    a: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    b: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

FriendSchema.index({ a: 1, b: 1 }, { unique: true });

export const Friend: Model<IFriend> =
  mongoose.models.Friend || mongoose.model<IFriend>('Friend', FriendSchema);

export function canonPair(x: Types.ObjectId | string, y: Types.ObjectId | string) {
  const xs = x.toString();
  const ys = y.toString();
  return xs < ys ? { a: xs, b: ys } : { a: ys, b: xs };
}
