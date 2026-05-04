import { Request, Response } from 'express';
import { z } from 'zod';
import { VibeResult } from '../models/VibeResult';
import { User } from '../models/User';
import { ARCHETYPES, archetypeById } from '../data/archetypes';
import { classifyImage } from '../services/groq';
import { generateArchetypeImage } from '../services/imageGen';
import { HttpError } from '../middleware/error';
import { config } from '../config/env';

const analyzeSchema = z.object({
  imageBase64: z.string().min(1000, 'image too small'),
  mimeType: z.string().optional(),
});

function startOfTodayUTC(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function analyzeVibe(req: Request, res: Response): Promise<void> {
  const parsed = analyzeSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(', '), 'validation_error');
  }
  const { imageBase64, mimeType } = parsed.data;

  // Daily quota for non-premium users
  if (req.user) {
    const user = await User.findById(req.user.sub);
    if (!user) throw new HttpError(404, 'User not found');
    if (!user.premium) {
      const since = startOfTodayUTC();
      const count = await VibeResult.countDocuments({ userId: user._id, createdAt: { $gte: since } });
      if (count >= config.freeDailyReads) {
        throw new HttpError(
          429,
          `Free plan allows ${config.freeDailyReads} vibe read per day. Upgrade for unlimited.`,
          'quota_exceeded'
        );
      }
    }
  }

  const cleaned = imageBase64.startsWith('data:')
    ? imageBase64.replace(/^data:[^;]+;base64,/, '')
    : imageBase64;

  const classification = await classifyImage(cleaned, mimeType || 'image/jpeg');
  const arche = archetypeById(classification.primaryArchetype);
  const cardImage = arche
    ? generateArchetypeImage(arche, cleaned.slice(0, 16)).url
    : null;

  const doc = await VibeResult.create({
    userId: req.user ? req.user.sub : null,
    primaryArchetype: classification.primaryArchetype,
    secondaryArchetype: classification.secondaryArchetype,
    confidence: classification.confidence,
    reasoning: classification.reasoning,
    essenceWords: classification.essenceWords,
    palette: classification.palette.length ? classification.palette : (arche?.palette ?? []),
    cardImageUrl: cardImage,
  });

  if (req.user) {
    await User.findByIdAndUpdate(req.user.sub, {
      $inc: { vibeCount: 1 },
      $set: { primaryArchetype: classification.primaryArchetype },
    });
  }

  const archetypeMeta = arche ? safeArche(arche) : null;
  res.status(201).json({
    result: doc.toJSONSafe(),
    archetype: archetypeMeta,
    secondaryArchetypeMeta: classification.secondaryArchetype
      ? safeArcheById(classification.secondaryArchetype)
      : null,
  });
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10) || 20, 100);
  const docs = await VibeResult.find({ userId: req.user.sub })
    .sort({ createdAt: -1 })
    .limit(limit);
  res.json({
    results: docs.map((d) => d.toJSONSafe()),
  });
}

export async function getResult(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const doc = await VibeResult.findById(id);
  if (!doc) throw new HttpError(404, 'Result not found');
  // owner can always view; otherwise it's a public shareable result
  res.json({
    result: doc.toJSONSafe(),
    archetype: safeArcheById(doc.primaryArchetype),
    secondaryArchetypeMeta: doc.secondaryArchetype ? safeArcheById(doc.secondaryArchetype) : null,
  });
}

export async function listArchetypes(_req: Request, res: Response): Promise<void> {
  res.json({ archetypes: ARCHETYPES.map(safeArche) });
}

export async function getArchetype(req: Request, res: Response): Promise<void> {
  const a = archetypeById(req.params.id);
  if (!a) throw new HttpError(404, 'Archetype not found');
  res.json({ archetype: safeArche(a) });
}

export async function getDistribution(_req: Request, res: Response): Promise<void> {
  // What % of users are each archetype
  const all = await User.aggregate<{ _id: string; count: number }>([
    { $match: { primaryArchetype: { $ne: null } } },
    { $group: { _id: '$primaryArchetype', count: { $sum: 1 } } },
  ]);
  const total = all.reduce((s, x) => s + x.count, 0);
  const map: Record<string, number> = {};
  for (const a of ARCHETYPES) map[a.id] = 0;
  for (const row of all) map[row._id] = row.count;
  const distribution = Object.entries(map).map(([id, count]) => ({
    id,
    count,
    pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
  }));
  res.json({ totalUsers: total, distribution });
}

function safeArche(a: (typeof ARCHETYPES)[number]) {
  return {
    id: a.id,
    name: a.name,
    description: a.description,
    palette: a.palette,
    essence: a.essence,
  };
}

function safeArcheById(id: string) {
  const a = archetypeById(id);
  return a ? safeArche(a) : null;
}
