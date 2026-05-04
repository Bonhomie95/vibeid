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

## Routes

| Path | Screen |
|---|---|
| `/` | Hero / Find My Vibe / Sign in |
| `/capture` | Take selfie or upload, then analyze |
| `/result/[id]` | Shareable VibeCard + reasoning + share button |
| `/auth` | Signup / login |
| `/profile` | Your archetype + history + friends list |
| `/explore` | All archetypes + distribution % |
| `/archetype/[id]` | Single archetype detail page |
| `/friends` | Add by username + clash inline |
| `/friend/[username]` | Friend's latest vibe |
| `/clash/[username]` | Full-screen compatibility reveal |

## Architecture

```
app/                         expo-router file-based routing
  _layout.tsx                root layout, configures API base url
  index.tsx                  hero
  capture.tsx                ImagePicker + analyze flow
  result/[id].tsx            shareable VibeCard + ViewShot capture
  auth.tsx                   email + username + password
  profile.tsx                user / history / friends
  explore.tsx                all archetypes grid
  archetype/[id].tsx         archetype detail
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

The result card uses `react-native-view-shot` to rasterize the React component into a PNG, then `expo-sharing` opens the system share sheet. On the wider web we'd point friends at `/r/<id>` which redirects into the app via the `vibeid://` scheme + `applinks:vibeid.app` association already declared in `app.json`.

## Token storage

`lib/storage.ts` writes the JWT to AsyncStorage on device and an in-memory Map in Node. Login / signup automatically persist — `authApi.hasToken()` lets the home screen show "My Profile" instead of "Sign in" on next launch.

## Production hardening to add

- Replace the hardcoded `apiBaseUrl` with a build-time env (`EXPO_PUBLIC_API_URL`) wired into EAS profiles.
- Re-render the card server-side for share parity (see backend README — Puppeteer pipeline).
- Add a "your vibe history" timeline visualization.
- Wire RevenueCat for Premium IAPs.
- Add Sentry / PostHog for crash + funnel analytics.
- Push notifications via Expo Notifications + FCM.
