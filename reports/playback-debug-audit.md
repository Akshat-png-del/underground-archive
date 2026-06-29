# Playback Debug Audit — Root Cause Report

**Date:** 2026-06-28  
**Verdict:** Playback failed due to an invalid embed iframe and optimistic UI state. Fixed.

---

## Symptoms

1. Clicking a track did not start audio
2. Play button toggled UI state without audible playback
3. Pause behaved inconsistently (nothing was playing)
4. Users opened PlayerModal / external windows to hear music
5. Touch/click felt laggy on mobile

---

## Root causes

### 1. Sub-minimum embed iframe (critical)

**File:** `src/lib/music/playback-engine.ts`

The Spotify/YouTube player ran inside a **1×1 px** hidden iframe. Spotify’s embed requires ~**352×152 px** minimum. Sub-size iframes load but **never start audio**, while React state still set `isPlaying: true`.

**Fix:** Resize embed host to `352×152`, fixed above the bottom player bar, `opacity: 0.02`, `pointer-events: none`.

### 2. Optimistic UI without engine feedback (critical)

**File:** `src/context/PlaybackContext.tsx`

`playNow()` updated React state to `isPlaying: true` before confirming the engine actually played. No error path when embed/audio failed. Pause toggled UI only.

**Fix:**
- `playbackEngine.sync()` returns `{ ok, error, mode }`
- Failed play sets `isPlaying: false` and `playbackError`
- HTML5 `<audio>` events (`playing`, `pause`, `waiting`, `error`) sync real state
- `console.error("Playback failed:", error)` on all failures

### 3. `audio.play()` inside `setState` updater (high)

**File:** `src/context/PlaybackContext.tsx`

Engine `sync()` was invoked **inside** the `setState` updater. React Strict Mode double-invokes updaters → duplicate sync calls and broken user-gesture chain for autoplay.

**Fix:** Call `playbackEngine.sync()` **synchronously after** `setState`, still within the click/pointer handler stack.

### 4. Missing playback source silently ignored (medium)

When a track had no Spotify/YouTube URL, engine set `mode: "idle"` but context still showed playing.

**Fix:** Explicit error log + `playbackError` state:
```
console.error("Playback failed:", "No playback source for …")
```

### 5. Swallowed `audio.play()` rejections (medium)

**File:** `src/lib/music/playback-engine.ts`

`.catch(() => {})` hid autoplay/CORS/404 errors.

**Fix:** `console.error("Playback failed:", error)` and surface error to context.

### 6. Mobile click latency (low)

300 ms tap delay on some mobile browsers; `onClick` only on play targets.

**Fix:**
- `touch-action: manipulation` on buttons/links (`globals.css`)
- `onPointerDown` + `preventDefault()` on track/play controls for immediate response
- `touch-manipulation` Tailwind class on play buttons

### 7. `force: same` prevented embed reload (low)

Re-clicking the same track sometimes skipped iframe `src` update after a failed first load.

**Fix:** `playNow` always passes `force: true`.

---

## Not the cause

| Checked | Result |
|---------|--------|
| Duplicate audio instances | Single singleton engine on `document.body` |
| Route unmounting player | `PlaybackProvider` at app root; engine DOM persists |
| Event propagation | `stopPropagation` correct on `MusicActions` |
| Muted audio | `audio.muted = false` before play |
| Modal required for play | Modal is details-only; not in play path |
| CORS on embeds | Spotify/YouTube embeds are designed for iframe use |

---

## Fixes applied

| File | Change |
|------|--------|
| `src/lib/music/playback-engine.ts` | 352×152 embed, async sync, error logging, audio event listeners, `playsinline` |
| `src/context/PlaybackContext.tsx` | Engine sync outside setState, `isLoading`/`playbackError`, status listener for audio |
| `src/components/music/GlobalPlayer.tsx` | Loading indicator, `aria-busy`, disable play while loading |
| `src/components/music/TrackRow.tsx` | `onPointerDown` for instant play |
| `src/components/music/MusicActions.tsx` | `onPointerDown`, play/pause logic uses `active && isPlaying` |
| `src/app/globals.css` | `touch-action: manipulation` |

---

## Architecture (unchanged)

```
Click/Pointer → playNow() → playbackEngine.sync() [sync in gesture stack]
                                    ↓
                    ┌───────────────┴───────────────┐
                    │  #vitalforge-playback-root     │
                    │    <iframe> Spotify/YouTube    │
                    │    <audio>  previewUrl (if any) │
                    └───────────────────────────────┘
                                    ↓
              GlobalPlayer UI ← PlaybackContext state
```

One engine instance. Route changes do not remove `#vitalforge-playback-root`.

---

## Limitations

- **Embed position:** Spotify/YouTube iframes do not expose `currentTime` to parent — position persistence only works for `previewUrl` HTML5 audio.
- **Autoplay on refresh:** Browser may block resume until user taps Play (logged, not silent).
- **Album Spotify URLs:** Embed plays album context, not always the exact track preview.

---

## Verification checklist

1. Click track row → audio starts within ~1s, bottom player shows track
2. Console has no `Playback failed` on valid tracks
3. Click second track → switches immediately
4. Pause → audio stops, icon matches
5. Navigate between pages → playback continues
6. Mobile tap on artwork → immediate response, no double-fire
7. Track with no URLs → console error, UI does not show false “playing”
