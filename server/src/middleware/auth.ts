import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../services/auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', message: 'Missing bearer token' });
    return;
  }
  const token = header.slice(7).trim();
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'unauthorized', message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7).trim();
  try {
    req.user = verifyToken(token);
  } catch {
    /* ignore */
  }
  next();
}
