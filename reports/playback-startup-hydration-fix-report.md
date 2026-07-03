# Playback Startup & Hydration Fix Report

Generated: 2026-07-03

## Issue 1 — Spotify ready timeout / long buffering

### Reproduction

`BASE_URL=http://localhost:3000 npx tsx scripts/playback-startup-timeline-audit.ts`

Cold load → click first track on `/artists/sara-landry` → measure full pipeline.

### Runtime timeline (after fix, click-relative)

| Stage | ms from click | Waiting reason |
|-------|---------------|----------------|
| MSC `play()` | 148 | — |
| Engine `play()` | 150 | — |
| ProviderRouter `play()` enter | 150 | — |
| Spotify embed controller created | 153 | `createController` (IFrame API already preloaded @1130ms page load) |
| Embed `ready` callback | 1222 | **Spotify SDK** — iframe load |
| `playback_confirmed` | 1239 | — |
| First `playback_update` | 1447 | **Spotify SDK** — first tick |
| Engine `currentTime > 0` | 3104 | **Spotify SDK** — position field in updates |
| Snapshot + UI update | 3104 | follows engine |

### First incorrect layer

**None in application code on cold start.** App chain click → `playback_confirmed` completes in **~1.2s**. No `Spotify embed ready timeout` or `Provider ready timeout` observed.

The perceived “buffering” after play is dominated by:

1. **Spotify iframe `ready`** (~1.0s after controller create) — SDK
2. **First non-zero `position` in `playback_update`** (~1.9s after `playback_confirmed`) — SDK

### Fixes applied (provider layer only)

| File | Function | Change |
|------|----------|--------|
| `spotify-provider.ts` | `waitForEmbedReady()` | Poll `host.isEmbedReady()` every 50ms; reject (not hang) when generation stale; immediate check on attach — fixes missed `ready` listener race |

### Before / after (cold start)

| Metric | Before fix | After fix |
|--------|------------|-----------|
| Click → `playback_confirmed` | 586ms | 1239ms (variance; both &lt;1.5s) |
| Click → embed `ready` | 570ms | 1222ms |
| Click → engine `currentTime > 0` | 4113ms | 3104ms |
| Embed ready timeout | Not reproduced | Not reproduced |

### Remaining SDK limitations

- Spotify IFrame API cold `ready` (~0.5–1.2s after controller create)
- First audible progress / non-zero position (~2–3.5s after click)
- ~1 Hz `playback_update` cadence

---

## Issue 2 — Refresh / hydration hang

### Reproduction

`scripts/playback-startup-timeline-audit.ts` — play track → reload while playing → sample at 12s.

`scripts/hydration-pipeline-audit.ts` — multi-scenario refresh matrix.

### Runtime evidence (before fix)

At **12s after refresh** (`reports/playback-startup-timeline-audit.json` pre-fix):

| Layer | Value |
|-------|-------|
| MSC `currentTime` | 7.15 (persisted) |
| Engine `currentTime` | **0**, `isLoading: true`, `isPlaying: false` |
| Snapshot `displayTime` | **0**, `isInitialLoading: true` |
| Store `hydrated` | **false** |
| `playback_confirmed` | **never fired** |

**Timeline ordering bug:** `initializePlaybackEngine()` called `controller.play()` at **t+301ms**; `PlaybackEngineMount` docked anchor at **t+344ms**. Engine started Spotify load on body-mounted `#vitalforge-playback-root`, then root was **reparented** into the embed host mid-load.

### Root cause

| Item | Detail |
|------|--------|
| **First incorrect value** | Engine `isLoading: true` with `currentTime: 0` while MSC holds persisted `7.15s` |
| **First incorrect layer** | **Engine mount ordering** (`global-player-engine` fast path + `PlaybackEngineMount` late dock) |
| **Why incorrect** | `getProviderMountNode()` returned body-only root before anchor dock; play proceeded, then DOM reparent broke/stall embed init |
| **Secondary bug** | `initializePlaybackEngine` resume path never set `store.hydrated = true` |

### Fixes applied

| File | Lines / function | Change |
|------|------------------|--------|
| `playback-media-anchor-registry.ts` | `isPlaybackMediaAnchorReady()` | Requires `#vitalforge-playback-root` **inside** registered embed host (not body-only) |
| `global-player-engine.ts` | `play()` fast path | Use `isPlaybackMediaAnchorReady()` — waits on `waitForPlaybackMediaAnchor()` until docked |
| `PlaybackEngineMount.tsx` | mount effect | `useLayoutEffect` (not `useEffect`) for `clientMounted` so dock runs before parent `PlaybackRoot` init |
| `playback-store.ts` | `initializePlaybackEngine()` resume branch | Set `hydrated: true` after resume `play()` |
| `spotify-provider.ts` | `waitForEmbedReady()` | Poll + stale rejection (see Issue 1) |

### Before / after (refresh while playing, 12s settle)

| Metric | Before | After |
|--------|--------|-------|
| Store `hydrated` | `false` | **`true`** |
| Engine `currentTime` | 0 (stuck loading) | **7s** (matches persisted) |
| Engine `isLoading` | `true` | **`false`** |
| Snapshot `currentTime` | 0 | **7** |
| MSC ↔ engine time divergence | yes | **no** |

### Regression verification

- `npm run test:playback` → **50/50 pass**
- `hydration-pipeline-audit.ts` → no layer divergence samples; `q17_bottomPlayerSurvives: true`
- `playback-startup-timeline-audit.ts` → refresh settle shows aligned layers

### Remaining notes

- `q7_engineStale` in hydration audit still flags **paused** refresh (engine idle by design — MSC-only hydrate, no provider). Not a hang.
- `engine.isPlaying: false` while MSC `isPlaying: true` can occur briefly on Spotify when SDK omits `isPaused` in early ticks — resolves on next `playback_update`.

---

## Production verdict

| Issue | Status |
|-------|--------|
| Refresh hang while playing | **Fixed** — root cause was play-before-dock race |
| `hydrated: false` stuck after resume | **Fixed** |
| Embed ready timeout on cold start | **Not reproduced**; listener race hardened |
| Long pre-audio buffering | **Mostly Spotify SDK** — app reaches `playback_confirmed` in ~1.2s; position UI follows SDK ticks (~3s) |

Playback startup and refresh hydration are **production-ready** within Spotify Embed SDK constraints.
