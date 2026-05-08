# Vibe ID — backend

Node.js + Express + TypeScript + MongoDB API for the Vibe ID app. Classifies user selfies into 50 cultural aesthetic archetypes (Dark Academia, Old Money, Soft Life, Hyperpop, Cyber Goth, …) using a Groq vision model, and generates an aesthetic art card via Pollinations.

## Quick start

```bash
cp .env.example .env
# Fill in GROQ_API_KEY (free tier from https://console.groq.com)
# Or leave MOCK_AI=true to run with deterministic stub data first

npm install
npm run dev          # tsx watch
npm test             # 375 assertions across unit/parser/HTTP suites
npm run typecheck
npm run build && npm start
```

## What's new in this version

### Hidden archetype catalog

The `/api/archetypes` list-all endpoint is gone. Users discover archetypes through their own reading and through their friends — never as a browsable menu. The catalog is the magic; revealing it ahead of time would dilute the result. Only `/api/archetypes/:id` (for hydrating a specific result) and `/api/archetypes/distribution` (for stats) remain. The internal `signals` field used by the AI classifier is never exposed in API responses.

### Identity lock-in (the "same person, same vibe" guarantee)

For logged-in users, once you have a primary archetype, every subsequent `/vibe/analyze` returns *that* archetype with a fresh poetic reasoning blurb. The classifier still runs (so the reasoning is responsive to the new photo), but the archetype itself is locked. To get a new one, pass `force: true` — the "Re-read my vibe" button on profile.

### Person-aware prompt

The classifier prompt was rewritten to read **the person**, not the photo. It explicitly tells the model to treat photo lighting, blur, resolution, and cropping as noise, and instead read presence, gaze, posture, and styling intent. Same person taking different photos now lands on the same archetype far more reliably.

### Optional CLIP person matching for anonymous reads

When `PERSON_MATCHING=clip`, the backend POSTs each anonymous selfie to a local CLIP embedding endpoint (`scripts/embed-server.py` — runs on Apple Silicon, ~150MB model, ~200ms per image) and stores the 512-dim embedding with the result. On future anonymous analyses, cosine similarity > `EMBED_SIM_THRESHOLD` (default 0.92) returns the prior archetype. **Off by default** — logged-in identity-lock alone solves 95% of the case. Turn this on if you have many anonymous users across devices.

To enable:

```bash
cd vibe-id-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/embed-server.py    # http://127.0.0.1:5050

# in .env:
PERSON_MATCHING=clip
```

The embed server uses MPS automatically on Apple Silicon (M1/M2/M3/M4/M5).

## Architecture

```
src/
  config/
    env.ts          environment loader
    db.ts           Mongoose connect/disconnect
  data/
    archetypes.ts   the 50-archetype catalog (id, palette, essence, prompt, signals)
  models/
    User.ts         Mongoose user schema + bcrypt + JWT-safe serializer
    VibeResult.ts   classification result, with optional 512-dim embedding
    Friend.ts       canonical-pair friendship model
  services/
    groq.ts         Groq vision classification + defensive JSON parsing
    imageGen.ts     Pollinations URL builder for archetype art card
    embed.ts        Optional CLIP embedding client + cosine similarity
    auth.ts         JWT sign / verify
  middleware/
    auth.ts         requireAuth + optionalAuth
    error.ts        HttpError + JSON error responses
  controllers/
    authController.ts
    vibeController.ts    classify + lock-in logic
    friendsController.ts
  routes/
    index.ts        all endpoints wired up
  server.ts         createApp() + main()
scripts/
  embed-server.py        local CLIP embedding service (Apple Silicon ready)
  requirements.txt       Python deps for embed server
test/
  unit.ts                archetype catalog + image URL builder + mock classifier
  groq-parsing.ts        defensive JSON parsing edge cases
  run.ts                 full HTTP integration suite (in-memory mongo stand-in)
  inMemoryStore.ts       test-only mongoose stand-in
```

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | /api/health | – | liveness |
| GET  | /api/archetypes/:id | – | one archetype meta (no internal signals) |
| GET  | /api/archetypes/distribution | – | % of users per archetype (users-only) |
| POST | /api/auth/signup | – | `{email, username, password}` → `{token, user}` |
| POST | /api/auth/login | – | `{email, password}` → `{token, user}` |
| GET  | /api/auth/me | bearer | current user |
| POST | /api/vibe/analyze | optional | `{imageBase64, force?}` → classify + art card url + `lockedIn` flag |
| GET  | /api/vibe/history | bearer | last N results for the user |
| GET  | /api/vibe/result/:id | – | shareable single result |
| POST | /api/friends/add | bearer | `{username}` |
| GET  | /api/friends | bearer | list of friends + their archetypes |
| GET  | /api/friends/:username/vibe | bearer | friend's latest vibe |
| GET  | /api/friends/clash?with=username | bearer | compatibility score + blurb |

`/api/archetypes` (list-all) is intentionally not exposed.

## Daily quota

Non-premium users get `FREE_DAILY_READS` analyses per UTC day. Anonymous users have no quota. The quota check happens before classification, so `force=true` re-reads count against it. Set `FREE_DAILY_READS` in `.env`.

## Testing

```bash
npm test    # 375 assertions:
            #   314 unit (archetypes catalog + URL builder + mock classifier)
            #    11 groq parser edge cases
            #    50 HTTP integration (every endpoint, lock-in, force, quota)
```

The HTTP suite uses an in-memory mongoose stand-in so tests run with no MongoDB binary on the host.

## Production hardening to add

- Real card-image rendering pipeline (Puppeteer or node-canvas) to bake the archetype name + palette + 3 essence words into the generated art for share-ready PNGs.
- Replicate (FLUX) for image generation in production. Cache 10–20 variations per archetype.
- For person matching at scale, swap the embedding cosine loop for a vector index (Atlas Vector Search, pgvector, Pinecone).
- Rate limit middleware (per IP for anonymous, per user for authed).
- Image moderation pass before classification (reject NSFW / minors).
- S3 / R2 upload for raw selfies if you want to keep them; otherwise discard after classify.
- Apple / Google IAP receipt validation for premium upgrades.
- Sentry / pino structured logging.
