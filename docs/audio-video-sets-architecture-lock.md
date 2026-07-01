# Audio / Video / Sets — Architecture Lock

**Status: LOCKED — do not refactor across domains**

This document enforces **three independent domains**. Future scaling (artists, tracks, sets, playlists, providers) must not cross-contaminate domains.

Companion docs:
- [`sets-video-architecture-freeze.md`](./sets-video-architecture-freeze.md) — Sets/Video file inventory
- [`playback-architecture.md`](./playback-architecture.md) — layer diagram

---

## Core principle

```
🎧 AUDIO     Spotify + preview + AudioPlayerBar + audio transport
🎬 VIDEO     YouTube embed + native controls + watch surfaces
🎭 SETS      /sets/[slug] navigation + layout + UI (no media transport)
```

Each domain follows:

```
UI → domain engine path → domain provider → media layer
```

**Never:**

```
UI → cross-domain system (audio ↔ video ↔ sets)
```

---

## Domain ownership

| Domain | UI | Providers | Transport | Session |
|--------|-----|-----------|-----------|---------|
| **Audio** | `AudioPlayerBar`, seek/volume/queue | `SpotifyProvider`, `AudioProvider` | play/pause/seek/volume/queue | store + engine |
| **Video** | `SetWatchSurface`, native YouTube | `YouTubeProvider` | **native embed only** | store + engine |
| **Sets** | `SetWatchPage`, metadata, related | none | **navigation only** | none (routes to video) |

---

## Absolute rules

1. **Audio controls audio only** — `AudioPlayerBar` never seeks/pauses YouTube.
2. **Video controls video only** — native YouTube UI; no bottom bar transport.
3. **Sets control navigation only** — browse → `/sets/[slug]`; no `playItem(set)` from browse.
4. **No shared transport UI** — do not merge audio bar with watch page.
5. **No store shape changes** for domain separation — use `playback-experience.ts` boundary.
6. **ProviderRouter** routes by source kind — do not add cross-domain decision logic in UI.

---

## Allowed data flow

### Audio

```
TrackRow / AudioPlayerBar
  → playback-actions (audio transport)
  → playback-store
  → global-player-engine
  → ProviderRouter → SpotifyProvider | AudioProvider
```

### Video

```
SetWatchPage → SetWatchSurface → useSetWatchDock
  → engine mount on data-set-watch-host
  → ProviderRouter → YouTubeProvider
  → native YouTube controls
```

### Sets

```
SetCard / browse surfaces
  → set-watch-navigation (router.push)
  → SetWatchPage (UI only)
```

---

## Forbidden patterns

| Pattern | Why |
|---------|-----|
| AudioPlayerBar visible on `/sets/[slug]` | Rule #3 freeze — zero audio UI during video |
| `seekTo()` while `resolvePlaybackExperience === 'video'` | Audio must not control video |
| Set browse calls `playItem(set)` | Sets must navigate, not audio-play |
| Import `AudioPlayerBar` in `src/components/sets/**` | Cross-domain UI coupling |
| Import `SetWatchSurface` in audio player | Cross-domain UI coupling |
| Reuse `isPlaying` from audio to drive YouTube UI | Shared state bleed |

---

## Shared infrastructure (change only with checklist)

These modules are **intentionally shared** but must not mix domain logic in UI:

- `global-player-engine.ts`
- `playback-store.ts`
- `provider-router.ts`
- `providers/*`
- `playback-experience.ts` — **domain boundary resolver**

Everything else is domain-specific.

---

## Dev-time enforcement

`src/lib/music/playback-domain-lock.ts` emits dev warnings when:

- Audio transport runs during video experience
- Audio bar renders on set watch page
- Set items hit audio transport without navigation

Run `npm run test:playback` — includes `domain-lock` contract tests.

---

## Pre-change checklist (all must be YES)

| Question | Required |
|----------|----------|
| Change affects only one domain? | Yes |
| Sets watch page unchanged? | Yes |
| Video playback unchanged? | Yes |
| Audio bar unchanged on artist pages? | Yes |
| No cross-import between domains? | Yes |
| No store shape change? | Yes |

If any **no** → stop and revert.

---

## Scalability guarantee

This lock supports:

- Unlimited artists, tracks, sets, playlists
- Multiple audio providers (Spotify, preview, future)
- Future video platforms (via `YouTubeProvider` swap)

Without:

- Cross-system interference
- Shared transport UI
- Sets triggering audio provider logic directly
