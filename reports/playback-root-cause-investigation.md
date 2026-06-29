# Playback Root Cause Investigation

**Date:** 2026-06-28  
**Scope:** Track (Spotify) playback silent despite `isPlaying: true`

---

## 1. Why `globalPlayerPresent: false`

**Not a playback engine failure.** This was a misleading debug probe.

| Probe field | What it checks | When false |
|-------------|----------------|------------|
| `globalPlayerPresent` | `[aria-label="Now playing"]` — the **GlobalPlayer UI bar** in `GlobalPlayer.tsx` | Before React re-renders after `store.play()`, or when `currentTrack` is null |
| `engineRootPresent` | `#vitalforge-playback-root[data-global-player]` on `document.body` | Engine never mounted (should not happen after init) |

**Exact line:** `src/lib/music/playback-debug.ts` line 141 (formerly conflated UI bar with engine):

```typescript
globalPlayerPresent: querySelector ? !!querySelector('[aria-label="Now playing"]') : false,
```

`GlobalPlayer` returns `null` until `currentTrack` is set (`GlobalPlayer.tsx` line 32). The engine DOM mount is **separate** and created by `globalPlayerEngine.mount()` on `document.body`.

**Conclusion:** `globalPlayerPresent: false` during `__playbackDebugDump()` immediately after click is **expected timing**, not evidence that playback is broken.

---

## 2. Is PlaybackRoot mounted correctly?

**Yes.**

| Check | Result |
|-------|--------|
| Mounted on every page? | **Yes** — `src/app/layout.tsx` line 78, inside `AppProviders` |
| Unmounts on navigation? | **No** — layout persists across App Router navigations |
| Mounted before first `play()`? | **Usually yes** — `useLayoutEffect` in `PlaybackRoot.tsx`; `play()` also calls `initializePlaybackEngine()` which mounts engine synchronously |
| Engine init before mount? | Engine mounts on first `initializePlaybackEngine()` or `play()` — both synchronous |
| Multiple PlaybackRoot instances? | **No** — single instance in root layout |
| `document.body` mount failing? | **No** — engine creates `#vitalforge-playback-root` directly on body |

Logs added:
- `[MOUNT] PlaybackRoot mounted`
- `[MOUNT] PlaybackRoot unmounted` (Fast Refresh / dev only)
- `[MOUNT] engine initialized`

---

## 3. Mount race condition?

**Previously low risk; hardened.**

Sequence after fix:

```
User click
  → store.play()
  → initializePlaybackEngine() → globalPlayerEngine.mount()  [sync]
  → if !engineRootPresent → queue play + warn               [edge case]
  → globalPlayerEngine.play()
  → Spotify: sync controller.play() if preloaded             [user gesture preserved]
  → YouTube: iframe.src assigned                             [sync]
```

**Exact lines:**
- Queue: `src/stores/playback-store.ts` — `play()` checks `isEngineMounted()`
- Flush: `initializePlaybackEngine()` resumes queued item via `globalPlayerEngine.play()`

---

## 4. Is Spotify iframe hidden?

**No CSS blockers in current engine styles.**

Container styles (`global-player-engine.ts` `applyEmbedContainerStyles`):

| Property | Value |
|----------|-------|
| display | block |
| visibility | visible |
| opacity | 1 |
| position | fixed; left: 0; bottom: 5.25rem |
| size | 352×152 px |
| offscreen (-9999px) | **No** |

Logs added:
- `[SPOTIFY] iframe visible?` — dimensions, computed styles, bounding rect
- `[SPOTIFY] autoplay risk detected` — from `probeEmbedAudibility()`

**Iframe was not hidden.** Visibility was not the root cause.

---

## 5. Exact root cause preventing track audio

### Primary cause (exact failing logic)

**File:** `src/lib/music/global-player-engine.ts` (previous `bindEmbedLoad` handler)

**Failure:** Spotify tracks used a raw iframe with `?autoplay=1`. On iframe `load`, the engine set `isPlaying: true`. **Spotify disabled URL-parameter autoplay** — the iframe loads but **does not start audio**. YouTube embeds still honor `autoplay=1` after a user gesture, which is why sets worked and tracks did not.

This is not a guess — it matches:
- All pipeline stages passing through `[EMBED]` / `[AUDIO]`
- Spotify's documented IFrame API autoplay restrictions
- Community reports that `autoplay=1` on embed URLs no longer works

### Secondary issue (false signal)

`globalPlayerPresent: false` in debug dumps — probe measured UI bar, not engine (see §1).

---

## 6. Fix applied (engine + store + debug only — no UI/layout/styling)

| File | Change |
|------|--------|
| `src/lib/music/spotify-embed-api.ts` | **New** — Spotify IFrame API loader, embed controller host, `loadUri()` + `play()` |
| `src/lib/music/global-player-engine.ts` | Spotify path uses IFrame API with **sync** `controller.play()` in user-gesture chain; preloads controller on mount; YouTube unchanged; `isPlaying` only on `playback_started` for Spotify |
| `src/stores/playback-store.ts` | Fast Refresh listener re-bind; queued play if root missing |
| `src/lib/music/playback-debug.ts` | Split `engineRootPresent` vs `globalPlayerPresent`; added `SPOTIFY` log step |
| `src/components/music/PlaybackRoot.tsx` | Mount/unmount + singleton invariant logs only |

**Not modified:** GlobalPlayer UI, layout, styling, card components.

---

## 7. Verification

1. Hard-refresh (`Cmd+Shift+R`)
2. Open `/artists/i-hate-models`
3. Click **Intergalactic Emotional Breakdown**
4. Console should show:
   - `[MOUNT] Spotify embed controller created` (on page load)
   - `[SPOTIFY] loadUri + play() sync (user gesture preserved)`
   - `[AUDIO] Spotify playback_started — marking playing`
5. Run `window.__playbackDebugDump()`:
   - `dom.engineRootPresent: true`
   - `store.globalPlayerUiPresent: true` (after React paint)
   - `audibility.audibilityRisk: []`

---

## 8. Fast Refresh

After code hot reload, `initializePlaybackEngine()` re-binds the state listener (`engine re-bound after Fast Refresh`) and reuses the persisted `#vitalforge-playback-root` DOM node. Spotify API cached on `window.__vitalforgeSpotifyIframeApi` to survive module reload.
