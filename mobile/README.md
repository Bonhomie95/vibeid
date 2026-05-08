# Vibe ID — mobile

Expo SDK 54 / React Native / TypeScript app that pairs with `vibe-id-backend`. Capture or upload a selfie, get a named aesthetic archetype with a beautiful shareable card.

## Quick start

```bash
cd vibe-id-backend && npm run dev   # backend on :4000

cd ../vibe-id-mobile
# Point the app at your backend. Local emulator → http://localhost:4000.
# Physical device on the same Wi-Fi → http://<your-mac-lan-ip>:4000
# Edit "extra.apiBaseUrl" in app.json, or set EXPO_PUBLIC_API_URL.
npm install
npm run typecheck
npm test                            # client/server contract test
npm start                           # then press i (iOS) or a (Android)
```

## What's new

- **Archetype catalog hidden.** No "browse archetypes" screen. Users discover archetypes through their own reading and through their friends. The mystery is the magic.
- **Identity lock-in.** Once you have a vibe, it sticks. Different photo, same archetype, fresh poetic reasoning.
- **Re-read my vibe.** A subtle button on profile that passes `force=true` to the analyze endpoint, bypassing lock-in for users who want a fresh take.

## Routes

| Path | Screen |
|---|---|
| `/` | Hero / Find My Vibe / Sign in |
| `/capture` | Take selfie or upload, then analyze. Accepts `?force=1` for re-read. |
| `/result/[id]` | Shareable VibeCard + reasoning + share button |
| `/auth` | Signup / login |
| `/profile` | Your archetype + history + friends list + Re-read button |
| `/friends` | Add by username + clash inline |
| `/friend/[username]` | Friend's latest vibe |
| `/clash/[username]` | Full-screen compatibility reveal |

There is no `/explore` and no `/archetype/:id` browsable directory — archetypes are revealed through use, not previewed from a menu.

## Architecture

```
app/                         expo-router file-based routing
  _layout.tsx                root layout, configures API base url
  index.tsx                  hero
  capture.tsx                ImagePicker + analyze flow (supports ?force=1)
  result/[id].tsx            shareable VibeCard + ViewShot capture
  auth.tsx                   email + username + password
  profile.tsx                user / history / friends / re-read
  friends.tsx                add + list + inline clash
  friend/[username]/index.tsx friend's latest vibe
  clash/[username].tsx       full-screen clash reveal
components/
  VibeCard.tsx               9:16 vertical card. Designed for screenshot share.
lib/
  api.ts                     typed client for every backend endpoint
  storage.ts                 AsyncStorage on RN, in-memory in Node tests
  theme.ts                   design tokens
  types.ts                   API response types (mirrors backend shape)
test/
  api.test.ts                runs the backend in-process and exercises the typed client
```

## Sharing

The result card uses `react-native-view-shot` to rasterize the React component into a PNG, then `expo-sharing` opens the system share sheet.

## Token storage

`lib/storage.ts` writes the JWT to AsyncStorage on device and an in-memory Map in Node tests. Login / signup automatically persist — `authApi.hasToken()` lets the home screen show "My Profile" instead of "Sign in" on next launch.
