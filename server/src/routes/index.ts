import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { signup, login, me } from '../controllers/authController';
import {
  analyzeVibe,
  getHistory,
  getResult,
  listArchetypes,
  getArchetype,
  getDistribution,
} from '../controllers/vibeController';
import { addFriend, listFriends, getFriendVibe, vibeClash } from '../controllers/friendsController';
import { requireAuth, optionalAuth } from '../middleware/auth';

export const router = Router();

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Async wrapper that forwards rejections to express error handler
const a = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// auth
router.post('/auth/signup', a(signup));
router.post('/auth/login', a(login));
router.get('/auth/me', requireAuth, a(me));

// archetypes
router.get('/archetypes', a(listArchetypes));
router.get('/archetypes/distribution', a(getDistribution));
router.get('/archetypes/:id', a(getArchetype));

// vibe
router.post('/vibe/analyze', optionalAuth, a(analyzeVibe));
router.get('/vibe/history', requireAuth, a(getHistory));
router.get('/vibe/result/:id', a(getResult));

// friends
router.post('/friends/add', requireAuth, a(addFriend));
router.get('/friends', requireAuth, a(listFriends));
router.get('/friends/clash', requireAuth, a(vibeClash));
router.get('/friends/:username/vibe', requireAuth, a(getFriendVibe));
