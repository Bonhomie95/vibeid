# Vibe ID — backend

Node.js + Express + TypeScript + MongoDB API for the Vibe ID app. Classifies user selfies into 36 cultural aesthetic archetypes (Dark Academia, Old Money, Soft Life, …) using a Groq vision model, and generates an aesthetic art card via Pollinations.

## Quick start

```bash
cp .env.example .env
# Fill in GROQ_API_KEY (free tier from https://console.groq.com)
# Or leave MOCK_AI=true to run with deterministic stub data first

npm install
npm run dev          # tsx watch
npm test             # full unit + parser + HTTP integration suite
npm run typecheck
npm run build && npm start
```

Defaults:
- `PORT=4000`
- `MONGO_URI=mongodb://127.0.0.1:27017/vibe_id`
- `IMAGE_PROVIDER=pollinations` (free, no key)
- `GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct`

## Architecture

```
src/
  config/
    env.ts          environment loader
    db.ts           Mongoose connect/disconnect
  data/
    archetypes.ts   the 36-archetype catalog (id, palette, essence, prompt, signals)
  models/
    User.ts         Mongoose user schema + bcrypt + JWT-safe serializer
    VibeResult.ts   classification result, owned by user or anonymous
    Friend.ts       canonical-pair friendship model
  services/
    groq.ts         Groq vision classification + defensive JSON parsing
    imageGen.ts     Pollinations URL builder for archetype art card
    auth.ts         JWT sign / verify
  middleware/
    auth.ts         requireAuth + optionalAuth
    error.ts        HttpError + JSON error responses
  controllers/
    authController.ts
    vibeController.ts
    friendsController.ts
  routes/
    index.ts        all endpoints wired up
  server.ts         createApp() + main()
test/
  unit.ts           archetype catalog + image URL builder + mock classifier
  groq-parsing.ts   defensive JSON parsing edge cases
  run.ts            full HTTP integration suite (in-memory mongo stand-in)
  inMemoryStore.ts  test-only mongoose stand-in
```

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | /api/health | – | liveness |
| GET  | /api/archetypes | – | list all archetypes |
| GET  | /api/archetypes/:id | – | one archetype |
| GET  | /api/archetypes/distribution | – | % of users per archetype |
| POST | /api/auth/signup | – | `{email, username, password}` → `{token, user}` |
| POST | /api/auth/login | – | `{email, password}` → `{token, user}` |
| GET  | /api/auth/me | bearer | current user |
| POST | /api/vibe/analyze | optional | `{imageBase64}` → classify + art card url |
| GET  | /api/vibe/history | bearer | last N results for the user |
| GET  | /api/vibe/result/:id | – | shareable single result |
| POST | /api/friends/add | bearer | `{username}` |
| GET  | /api/friends | bearer | list of friends + their archetypes |
| GET  | /api/friends/:username/vibe | bearer | friend's latest vibe |
| GET  | /api/friends/clash?with=username | bearer | compatibility score + blurb |

## Daily quota

Non-premium users get `FREE_DAILY_READS` analyses per UTC day. Anonymous users have no quota (no account = no row to count). Set `FREE_DAILY_READS` in `.env`.

## Image generation

Pollinations is keyless and free, fine for testing. To switch to FLUX via Replicate later, add a Replicate path in `services/imageGen.ts` and set `IMAGE_PROVIDER=replicate`.

## Testing without Groq or Mongo

Setting `MOCK_AI=true` in `.env` skips the live Groq call and returns a deterministic archetype derived from the image bytes. The test suite uses an in-memory mongoose stand-in so it runs even without a local MongoDB.

```bash
npm test    # 280 assertions, all passing
```

## Production hardening to add

- Real card-image rendering pipeline (Puppeteer or node-canvas) to bake the archetype name + palette + 3 essence words into the generated art for share-ready PNGs.
- Replicate (FLUX) for image generation in production. Cache 10–20 variations per archetype.
- Rate limit middleware (per IP for anonymous, per user for authed).
- Image moderation pass before classification (reject NSFW / minors).
- S3 / R2 upload for raw selfies if you want to keep them; otherwise discard after classify.
- Apple / Google IAP receipt validation for premium upgrades.
- Push notifications via Expo + FCM for "your monthly vibe is ready" prompts.
- Sentry / pino structured logging.
