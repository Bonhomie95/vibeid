import { Request, Response } from 'express';
import { z } from 'zod';
import { User, hashPassword } from '../models/User';
import { signToken } from '../services/auth';
import { HttpError } from '../middleware/error';

const signupSchema = z.object({
  email: z.string().email().max(120),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_.]+$/, 'username must be letters, numbers, underscore or dot'),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export async function signup(req: Request, res: Response): Promise<void> {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(', '), 'validation_error');
  }
  const { email, username, password } = parsed.data;

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    if (existing.email === email) throw new HttpError(409, 'Email already registered', 'email_taken');
    throw new HttpError(409, 'Username already taken', 'username_taken');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, username, passwordHash });
  const token = signToken({ sub: user._id.toString(), username: user.username });
  res.status(201).json({ token, user: user.toSafeJSON() });
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new HttpError(400, 'Email and password required', 'validation_error');
  }
  const { email, password } = parsed.data;
  const user = await User.findOne({ email });
  if (!user) throw new HttpError(401, 'Invalid credentials', 'invalid_credentials');
  const ok = await user.comparePassword(password);
  if (!ok) throw new HttpError(401, 'Invalid credentials', 'invalid_credentials');
  const token = signToken({ sub: user._id.toString(), username: user.username });
  res.json({ token, user: user.toSafeJSON() });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) throw new HttpError(401, 'Unauthorized');
  const user = await User.findById(req.user.sub);
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ user: user.toSafeJSON() });
}
