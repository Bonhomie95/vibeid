import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IVibeResult extends Document {
  userId: Types.ObjectId | null; // anonymous reads have no user
  primaryArchetype: string;
  secondaryArchetype: string | null;
  confidence: number;
  reasoning: string;
  essenceWords: string[];
  palette: string[];
  cardImageUrl: string | null;
  // Optional CLIP embedding (length 512). Used to dedupe anonymous reads
  // of the same person across different photos. Null when person
  // matching is disabled.
  embedding: number[] | null;
  createdAt: Date;
  toJSONSafe(): VibeResultJSON;
}

export interface VibeResultJSON {
  id: string;
  userId: string | null;
  primaryArchetype: string;
  secondaryArchetype: string | null;
  confidence: number;
  reasoning: string;
  essenceWords: string[];
  palette: string[];
  cardImageUrl: string | null;
  createdAt: string;
}

const VibeResultSchema = new Schema<IVibeResult>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    primaryArchetype: { type: String, required: true, index: true },
    secondaryArchetype: { type: String, default: null },
    confidence: { type: Number, required: true, min: 0, max: 1 },
    reasoning: { type: String, default: '' },
    essenceWords: { type: [String], default: [] },
    palette: { type: [String], default: [] },
    cardImageUrl: { type: String, default: null },
    embedding: { type: [Number], default: null, select: false }, // not returned by default
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

VibeResultSchema.methods.toJSONSafe = function (): VibeResultJSON {
  return {
    id: this._id.toString(),
    userId: this.userId ? this.userId.toString() : null,
    primaryArchetype: this.primaryArchetype,
    secondaryArchetype: this.secondaryArchetype,
    confidence: this.confidence,
    reasoning: this.reasoning,
    essenceWords: this.essenceWords,
    palette: this.palette,
    cardImageUrl: this.cardImageUrl,
    createdAt: this.createdAt.toISOString(),
  };
};

export const VibeResult: Model<IVibeResult> =
  mongoose.models.VibeResult || mongoose.model<IVibeResult>('VibeResult', VibeResultSchema);
