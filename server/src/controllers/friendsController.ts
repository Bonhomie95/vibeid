import { Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Friend, canonPair } from '../models/Friend';
import { User } from '../models/User';
import { VibeResult } from '../models/VibeResult';
import { HttpError } from '../middleware/error';
import { archetypeById, ARCHETYPES } from '../data/archetypes';

const addSchema = z.object({
  username: z.string().min(3).max(24),
});

export async function addFriend(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'username required');
  if (parsed.data.username === req.user.username) {
    throw new HttpError(400, 'You cannot add yourself');
  }
  const target = await User.findOne({ username: parsed.data.username });
  if (!target) throw new HttpError(404, 'User not found');
  const pair = canonPair(req.user.sub, target._id.toString());
  try {
    await Friend.create(pair);
  } catch (e: unknown) {
    const err = e as { code?: number };
    if (err.code === 11000) {
      // already friends — idempotent
    } else {
      throw e;
    }
  }
  res.json({ ok: true, friend: target.toSafeJSON() });
}

export async function listFriends(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const me = new mongoose.Types.ObjectId(req.user.sub);
  const links = await Friend.find({ $or: [{ a: me }, { b: me }] });
  const ids = links.map((l) => (l.a.equals(me) ? l.b : l.a));
  const friends = await User.find({ _id: { $in: ids } });
  res.json({
    friends: friends.map((f) => ({
      ...f.toSafeJSON(),
      archetypeMeta: f.primaryArchetype ? archetypeById(f.primaryArchetype) ?? null : null,
    })),
  });
}

export async function getFriendVibe(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const friend = await User.findOne({ username: req.params.username });
  if (!friend) throw new HttpError(404, 'User not found');
  const me = new mongoose.Types.ObjectId(req.user.sub);
  const link = await Friend.findOne({ ...canonPair(me.toString(), friend._id.toString()) });
  if (!link) throw new HttpError(403, 'Not friends');
  const last = await VibeResult.findOne({ userId: friend._id }).sort({ createdAt: -1 });
  res.json({
    user: friend.toSafeJSON(),
    latestResult: last ? last.toJSONSafe() : null,
    archetype: friend.primaryArchetype ? archetypeById(friend.primaryArchetype) ?? null : null,
  });
}

export async function vibeClash(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const otherUsername = String(req.query.with || '');
  if (!otherUsername) throw new HttpError(400, 'Missing ?with=<username>');
  const me = await User.findById(req.user.sub);
  if (!me) throw new HttpError(404, 'User not found');
  const other = await User.findOne({ username: otherUsername });
  if (!other) throw new HttpError(404, 'Other user not found');
  if (!me.primaryArchetype || !other.primaryArchetype) {
    throw new HttpError(400, 'Both users must have a vibe before clashing');
  }
  const a = archetypeById(me.primaryArchetype);
  const b = archetypeById(other.primaryArchetype);
  if (!a || !b) throw new HttpError(500, 'Archetype data missing');

  // Compatibility: rough heuristic on shared essence overlap + palette closeness
  const sharedEssence = a.essence.filter((w) => b.essence.includes(w)).length;
  const score = Math.min(
    100,
    40 + sharedEssence * 18 + Math.round(paletteCloseness(a.palette, b.palette) * 30)
  );

  const blurb =
    a.id === b.id
      ? `Two ${a.name}s in one frame. The volume of agreement is almost suspicious.`
      : `${a.name} meets ${b.name}. ${pairBlurb(a.id, b.id)}`;

  res.json({
    score,
    me: { id: me._id.toString(), username: me.username, archetype: a },
    other: { id: other._id.toString(), username: other.username, archetype: b },
    blurb,
  });
}

function paletteCloseness(p1: string[], p2: string[]): number {
  // Average min RGB distance per color in p1
  const c1 = p1.map(hexToRgb).filter(Boolean) as RGB[];
  const c2 = p2.map(hexToRgb).filter(Boolean) as RGB[];
  if (c1.length === 0 || c2.length === 0) return 0.5;
  let sum = 0;
  for (const a of c1) {
    let min = Infinity;
    for (const b of c2) {
      const d = Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
      if (d < min) min = d;
    }
    sum += min;
  }
  const avg = sum / c1.length;
  // 0..441 (max RGB dist) -> 1..0
  return Math.max(0, Math.min(1, 1 - avg / 441));
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB | null {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (isNaN(n)) return null;
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function pairBlurb(idA: string, idB: string): string {
  const lookup: Record<string, string> = {
    'dark_academia|old_money': 'Two libraries with different lock systems, but the same patient stillness.',
    'chaotic_creative|minimalist_intellectual': 'A volcano dating a glacier. Somehow the weather cooperates.',
    'soft_life|coastal_grandmother': 'Both of you would set a place at the table. Both of you mean it.',
    'cottagecore|witchy': 'Same forest, different hours. You both know which leaves to keep.',
    'streetwear_kid|tech_minimalist': 'You speak in different syntaxes but both ship cleanly.',
  };
  const key = [idA, idB].sort().join('|');
  return (
    lookup[key] ||
    `Different vocabularies, same emotional grammar. There is genuine curiosity between these two energies.`
  );
}

// Surface helper to avoid lint warning
export const __debug = { ARCHETYPES };
