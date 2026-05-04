import jwt, { SignOptions, Secret } from 'jsonwebtoken';
import { config } from '../config/env';

export interface JwtPayload {
  sub: string; // user id
  username: string;
}

export function signToken(payload: JwtPayload): string {
  const opts: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, config.jwtSecret as Secret, opts);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwtSecret as Secret) as JwtPayload;
}
