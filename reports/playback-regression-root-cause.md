# Playback Regression — Root Cause Report

Date: 2026-06-28  
Baseline commit (last known working): `caf85d5` — *stable spotify iframe api playback*  
Regression scope: uncommitted changes on `playback-debug` branch

---

## Symptom

Tracks (Spotify) and sets (YouTube) no longer produce audible playback after recent UX/architecture work.

---

## Audit Checklist

| Stage | Status | Notes |
|-------|--------|-------|
| 1. PlaybackRoot mounting | OK | `useLayoutEffect` → `initializePlaybackEngine()` still runs |
| 2. `#vitalforge-playback-root` | OK | Created on `document.body` in `globalPlayerEngine.mount()` |
| 3. Singleton engine init | **REGRESSED** | Spotify preload removed; container hidden on mount |
| 4. Spotify IFrame API | **REGRESSED** | Controller not preloaded → async path loses user-gesture chain |
| 5. YouTube init | **REGRESSED** | Switched from sync `iframe.src` to async YT IFrame API |
| 6. playback-source resolution | OK | Unchanged; sources resolve correctly |
| 7. playback-store sync | Minor | Transport optimistic updates removed; engine still called |
| 8. iframe destruction on switch | OK | `purgeContainerMedia()` intentional; not root cause |

---

## Exact Failure Stage

Playback dies at **stage 4 (Spotify)** and **stage 5 (YouTube)** inside `globalPlayerEngine.play()` — after `[SOURCE]` resolves correctly, media providers never start audibly.

### Expected log sequence (working)

```
[CLICK] card pointerdown
[STORE] play() action dispatched
[ENGINE] play requested
[SOURCE] resolved { kind: "spotify" | "youtube", ... }
[SPOTIFY] loadUri + play() sync (user gesture preserved)   ← Spotify
[YOUTUBE] setting iframe.src (sync, user-gesture chain)    ← YouTube
[AUDIO] Spotify playback_started / YouTube iframe load complete
```

### Broken log sequence (regression)

```
[CLICK] → [STORE] → [ENGINE] → [SOURCE]   ✓
[MOUNT] Spotify controller not ready — falling back to async play   ← Spotify dead-end
[YOUTUBE] YouTube IFrame API player ready (async, after gesture expired)   ← YouTube silent
[SPOTIFY] autoplay risk detected: visibilityHidden / opacityZero / outsideViewport
```

---

## Root Causes (3 regressions in `global-player-engine.ts`)

### RC-1: Embed container made invisible (autoplay policy)

**File:** `src/lib/music/global-player-engine.ts` — `applyEmbedContainerStyles()`

**Regression change:**
```diff
- left:0; bottom:5.25rem; opacity:1; visibility:visible; z-index:39
+ left:-9999px; opacity:0; visibility:hidden; z-index:-1
```

**Effect:** Browsers block autoplay on hidden/off-screen embeds. Spotify `probeEmbedAudibility()` flags `visibilityHidden`, `opacityZero`, `outsideViewport`.

**Introduced by:** Floating-player / click-through UX work (not committed).

---

### RC-2: Spotify controller preload removed from `mount()`

**File:** `src/lib/music/global-player-engine.ts` — `mount()`

**Regression change:**
```diff
- void this.spotifyHost.mount(container, EMBED_WIDTH, EMBED_HEIGHT)
+ this.purgeContainerMedia()   // no preload
```

**Effect:** First `play()` always hits `startSpotifyEmbedAsync()` because `spotifyHost.isReady() === false`. Async `controller.play()` runs outside the user-gesture chain → silent Spotify.

**Working path requires:** `startSpotifyEmbedSync()` with preloaded controller during click handler.

---

### RC-3: YouTube switched from sync iframe to async IFrame API

**File:** `src/lib/music/global-player-engine.ts` — `startYoutubeEmbed()` / `mountYoutubePlayer()`

**Regression change:**
```diff
- iframe.src = embedUrl   // synchronous in click handler
+ await createYouTubePlayer(...)   // async; playVideo() after API load
```

**Effect:** YouTube playback starts after `await`, breaking user-activation requirements for autoplay. UI shows loading; no audio.

**Last working approach:** Direct embed URL with `autoplay=1` on a single iframe (`caf85d5`).

---

## Secondary (non-blocking)

| Change | Impact |
|--------|--------|
| `playback-store.ts` — engine-only transport writer | UI may lag; does not block audio |
| `GlobalPlayer.tsx` — missing import (fixed separately) | Runtime crash of UI shell, not engine |
| Architecture refactor (`playback-actions.ts`) | Click path still reaches `store.play()` |

---

## Fix Applied (backend only)

Restored in `global-player-engine.ts`:

1. **Audible embed container** — `opacity:1`, `visibility:visible`, `pointer-events:none`, `bottom:0` (engine host, not UI player)
2. **Spotify preload on mount** — `spotifyHost.mount()` restored
3. **YouTube sync iframe** — `iframe.src = embedUrl` restored; removed async `mountYoutubePlayer()` from play path
4. **Store transport hints** — `isLoading`/`isPlaying` optimistic updates on play/pause/resume restored

No UI layout, styling, player positioning, card, or animation changes.

---

## Manual Verification Required

**I cannot confirm audible playback from this environment.** Please verify in a real browser:

| Test | Expected |
|------|----------|
| Track → Spotify | Audio within 1–2s; `[SPOTIFY] loadUri + play() sync` in console |
| Set → YouTube | Video audio; `[YOUTUBE] iframe load complete` in console |
| Track A → Track B | Switches without duplicate iframes |
| Set A → Set B | YouTube reloads |
| Track → Set | Provider switch |
| Set → Track | Provider switch |

### Debug commands (browser console)

```js
__playbackDebug.dump()          // store + DOM probe
// Filter console: CLICK, STORE, ENGINE, SOURCE, SPOTIFY, YOUTUBE, MOUNT
```

### npm scripts

```bash
npm run test:playback     # contract tests (18 passing)
npm run stress:playback   # engine race tests
```

---

## Regression Attribution

| Introduced | Files | Commits |
|------------|-------|---------|
| Spotify silent | `global-player-engine.ts` | Uncommitted UX/architecture session |
| YouTube silent | `global-player-engine.ts`, `youtube-embed-api.ts` (new) | Uncommitted seek-bar work |
| UI crash | `GlobalPlayer.tsx` | Missing `usePlaybackStore` import (fixed) |

**Not the cause:** `playback-source.ts`, `PlaybackRoot.tsx`, card components, `playback-actions.ts`.

---

## Follow-up (after manual confirmation)

- YouTube seek: re-introduce YT IFrame API **only for seek**, keeping sync iframe for initial play
- Keep embed audibility invariant in `audit:playback-arch` or engine self-check on mount
