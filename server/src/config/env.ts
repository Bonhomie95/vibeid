import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1' || v === 'yes';
}

function int(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return isNaN(n) ? fallback : n;
}

export const config = {
  port: int('PORT', 4000),
  nodeEnv: optional('NODE_ENV', 'development'),
  mongoUri: optional('MONGO_URI', 'mongodb://127.0.0.1:27017/vibe_id'),
  jwtSecret: optional('JWT_SECRET', 'dev-only-jwt-secret-please-change'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '30d'),
  groqApiKey: optional('GROQ_API_KEY', ''),
  groqVisionModel: optional('GROQ_VISION_MODEL', 'meta-llama/llama-4-scout-17b-16e-instruct'),
  groqTextModel: optional('GROQ_TEXT_MODEL', 'llama-3.3-70b-versatile'),
  imageProvider: optional('IMAGE_PROVIDER', 'pollinations'),
  mockAi: bool('MOCK_AI', false),
  freeDailyReads: int('FREE_DAILY_READS', 1),
  // Optional person matching. When 'clip', anonymous analyses are deduped
  // by image embedding similarity so the same person gets the same vibe.
  // Run scripts/embed-server.py to provide the endpoint.
  personMatching: optional('PERSON_MATCHING', 'off'), // 'off' | 'clip'
  embedUrl: optional('EMBED_URL', 'http://127.0.0.1:5050/embed'),
  // Cosine sim above this returns the prior archetype.
  embedSimThreshold: parseFloat(optional('EMBED_SIM_THRESHOLD', '0.92')),
} as const;

export function isProd() {
  return config.nodeEnv === 'production';
}
