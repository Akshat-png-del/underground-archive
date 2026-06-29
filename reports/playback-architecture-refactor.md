# Playback Architecture Refactor

Generated: 2026-06-28

## Previous architecture

```
┌─────────────────────────────────────────────────────────────┐
│ PlaybackProvider (React Context + useReducer)               │
│   ├── useState mirrors engine state                         │
│   ├── playNow() → setState() THEN async engine.sync()       │
│   ├── togglePlayPause() → setState() THEN engine.sync()     │
│   ├── PersistentPlaybackMount                               │
│   └── GlobalPlayer (inside provider)                        │
├─────────────────────────────────────────────────────────────┤
│ playback-engine.ts (PlaybackEngine class)                   │
│   ├── sync(item, isPlaying) — dual-parameter API           │
│   ├── No generation tokens / cancellation                   │
│   └── Status listeners only for audio mode                  │
└─────────────────────────────────────────────────────────────┘
         ↕ race: React state vs async sync() promises
```

### Root causes

| Issue | Cause |
|-------|--------|
| Play button doesn't start | UI set `isPlaying: true` before engine confirmed; embed load not awaited consistently |
| Pause out of sync | `togglePlayPause` flipped React state first; embed pause (blank iframe) didn't update React for embed mode |
| Track switch glitches | Overlapping `sync()` calls with no cancellation; stale promises wrote state |
| Navigation interrupts | Provider remount risk + dual state; engine DOM persisted but React state reset |
| Rapid click breaks state | No operation generation; Track A/B/C async completions raced |
| Incorrect play UI | React reducer and engine listeners both wrote `isPlaying` independently |

### Race conditions fixed

1. **Generation tokens** — Every `play()` / `stop()` bumps `activeGeneration`. Async audio `play()` and iframe `load` handlers check `isStale(gen)` before committing.
2. **Single writer** — `GlobalPlayerEngine` is the only writer of `isPlaying`, `isLoading`, `currentTime`, `duration` during playback.
3. **Zustand store** — UI reads one store; engine pushes patches via `setStateListener`.
4. **No optimistic isPlaying** — Store sets `isLoading: true` on play; `isPlaying: true` only after engine `play` / `canplay` / embed `load` events.

## Components removed from playback ownership

| Removed | Reason |
|---------|--------|
| `PlaybackProvider` (stateful) | Replaced by Zustand + root mount |
| `playback-engine.ts` | Replaced by `global-player-engine.ts` |
| `PersistentPlaybackMount.tsx` | Merged into `PlaybackRoot` |
| Inline iframes in components | Already removed (prior pass) |
| `PlayerModal` embed playback | Details-only; no audio instance |

## Final architecture

```
app/layout.tsx
└── AppProviders
    └── …
    └── PlaybackRoot          ← ONLY player mount point
          ├── initializePlaybackEngine()  [once]
          └── GlobalPlayer UI

┌──────────────────────────────────────────────────────────────┐
│ Zustand: usePlaybackStore (src/stores/playback-store.ts)     │
│   currentTrack, queue, queueIndex                            │
│   isPlaying, isLoading, currentTime, duration, error       │
│   play / pause / resume / stop / seek / next / previous      │
└───────────────────────────┬──────────────────────────────────┘
                            │ commands
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ GlobalPlayerEngine (singleton, global-player-engine.ts)      │
│   DOM: #vitalforge-playback-root on document.body            │
│   ├── one <audio>  (preview URLs)                            │
│   └── one <iframe> (Spotify / YouTube embeds)                │
│   generation token cancels stale play() operations           │
└───────────────────────────┬──────────────────────────────────┘
                            │ state patches
                            ▼
                    usePlaybackStore.setState()

All track/set/row components → player.play(item) or usePlayback()
```

### API

```typescript
import { player } from "@/lib/music/player";

player.play(track);   // start / switch
player.pause();
player.resume();
player.stop();
player.seek(seconds);
player.next();
player.previous();
```

### Audio event wiring

| Event | Handler |
|-------|---------|
| `play` | `isPlaying: true`, `isLoading: false` |
| `pause` | `isPlaying: false` |
| `ended` | `isPlaying: false`, `currentTime: 0` |
| `error` | `error`, `isPlaying: false` |
| `waiting` | `isLoading: true` |
| `canplay` | `isLoading: false` |
| `loadedmetadata` | `duration` |
| `timeupdate` | `currentTime` |
| iframe `load` | `isPlaying: true` (embed mode) |

### Logging

All engine actions log with `[PLAYER]` prefix:

```
[PLAYER] Play: track/artist::title (gen 3)
[PLAYER] Pause
[PLAYER] Track changed (embed) set-id
[PLAYER] Error: No playback source
```

## Stress test

```bash
npm run stress:playback
```

Simulates:

- Rapid track/set switching (8 items) — only last item remains active
- Rapid pause / resume cycles
- Stop cancelling pending operations

## Files

| File | Role |
|------|------|
| `src/lib/music/global-player-engine.ts` | Singleton DOM engine + generation guards |
| `src/stores/playback-store.ts` | Zustand global state |
| `src/lib/music/player.ts` | Imperative API |
| `src/components/music/PlaybackRoot.tsx` | Root mount in layout |
| `src/context/PlaybackContext.tsx` | Thin `usePlayback()` compat hook |
| `scripts/stress-test-playback.ts` | Automated stress test |

## Embed limitation (unchanged)

Spotify/YouTube iframes do not expose play/pause/time to the parent document. Embed mode uses **intent state**: pause blanks the iframe; resume reloads the last embed URL. HTML5 preview tracks get full event-driven sync.
