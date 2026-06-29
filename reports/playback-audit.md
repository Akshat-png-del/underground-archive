# Playback Audit Report

**Date:** 2026-06-28  
**Scope:** Global player, track/row click handlers, embed lifecycle, play/pause sync  
**Verdict:** Root causes identified and fixed in this pass.

---

## Symptoms (reported)

- Clicking a track did not start playback reliably
- Play/Pause buttons did not reflect actual audio state
- Switching tracks required multiple clicks
- Some interactions toggled playback off instead of starting

---

## Architecture (unchanged)

Playback uses **Spotify / YouTube iframe embeds** (not native `<audio>`). A single persistent hidden iframe loads embed URLs with `autoplay=1`. UI state lives in `PlaybackProvider`; the bottom bar is `GlobalPlayer`.

| Layer | File |
|-------|------|
| State | `src/context/PlaybackContext.tsx` |
| Embed URL | `src/lib/music/playback.ts` |
| Bottom bar | `src/components/music/GlobalPlayer.tsx` |
| Row actions | `src/components/music/TrackRow.tsx`, `MusicActions.tsx` |
| Discovery | `src/components/home/TodaysDiscovery.tsx` |

---

## Root causes

### 1. Split state updates with side effects inside `setCurrent` (critical)

**Before:** `play()` called `setIsPlaying()` and `setDetailsOpen()` *inside* the `setCurrent()` updater:

```ts
setCurrent((prev) => {
  if (isSamePlaybackItem(prev, item)) {
    setIsPlaying((playing) => !playing); // side effect in updater
    return prev;
  }
  setIsPlaying(true);
  setDetailsOpen(false);
  return item;
});
```

**Impact:**

- Two independent `useState` hooks could desync (`current` vs `isPlaying`)
- React Strict Mode double-invokes updaters in dev, causing spurious toggles
- Track row clicks on an already-active track **toggled pause** instead of ensuring playback

### 2. Iframe mounted after async re-render (autoplay policy)

**Before:** `GlobalPlayer` conditionally rendered an iframe only when `isPlaying` was true, keyed by `${type}-${refId}-${isPlaying}`.

**Impact:**

- User click → `setState` → re-render → iframe created **after** the gesture stack ended
- Browsers block `autoplay=1` on embeds not created synchronously from the click handler
- Playback appeared “broken” or required extra clicks to retry

### 3. Toggle semantics on row clicks (UX bug)

**Before:** Row artwork/title and the compact Play button both called the same `play()` which **toggled** when the track was already active.

**Impact:**

- Clicking title while the track was highlighted paused it
- Felt like “multiple clicks required” or “play doesn’t work”

### 4. No single embed instance

**Before:** Iframe unmounted on pause (`embedUrl = null`) and remounted with a new key on resume.

**Impact:**

- Extra load latency on resume
- Risk of overlapping embed instances during fast track switches

---

## What was NOT a problem

| Check | Result |
|-------|--------|
| Duplicate `PlaybackProvider` | Single provider in `Providers.tsx` |
| Event bubbling from `MusicActions` | `stopPropagation()` already correct |
| Modal before playback | `PlayerModal` only opens via “View details”, not on play |
| `refId` mismatch between row and actions | Both use `track.id \|\| trackId(...)` |
| Missing Spotify URLs in catalog | Tracks have Spotify URLs; embed builder handles track/album URLs |

---

## Fixes applied

### 1. Unified atomic state (`PlaybackContext.tsx`)

- Single `PlaybackState` object: `{ current, isPlaying, detailsOpen }`
- Pure `playbackReducer` — no nested `setState` calls
- **`playNow(item)`** — always starts or resumes; never toggles off on row click
- **`togglePlayPause()`** — explicit pause/resume for controls only

### 2. Persistent iframe with synchronous `src` updates (`playback.ts`)

- Added `syncPlaybackEmbed(iframe, item, isPlaying, { force? })`
- Iframe always mounted in `PlaybackProvider` (not in `GlobalPlayer`)
- `src` updated **inside** the `setState` updater during click handlers (same synchronous stack as the gesture)
- Pause sets `src` to `about:blank`; resume/switch sets embed URL with `autoplay=1`
- `useLayoutEffect` re-syncs as a safety net after render

### 3. Click handler semantics

| Surface | Behavior |
|---------|----------|
| Track row artwork/title | `playNow()` — start or resume |
| `MusicActions` Play (inactive track) | `playNow()` |
| `MusicActions` Pause (active track) | `togglePlayPause()` |
| Global player Play/Pause | `togglePlayPause()` |
| Today’s Discovery track | `playNow()` |

### 4. Removed conditional iframe from `GlobalPlayer`

- Bottom bar is UI-only
- No remount-on-pause; one embed instance for the session

---

## Expected behavior after fix

- **Single click** on a track row starts playback immediately
- **Play/Pause** controls reflect `isPlaying` state (which drives the embed `src`)
- **Only one track** plays — switching tracks updates the single iframe `src`
- **No modal** before playback
- Row click on an already-playing track keeps playing (or retries embed if it failed to load)

---

## Known limitations (platform, not regressions)

1. **No true audio element** — We cannot read Spotify/YouTube’s internal play/pause state via postMessage without their SDK. UI `isPlaying` reflects our intent; embed autoplay may still be blocked in strict browser policies if the user never interacted with the page.

2. **Album embeds** — Some catalog entries use Spotify album URLs; the embed plays the album, not necessarily the exact track preview.

3. **Resume after pause** — Requires a user gesture for `autoplay=1` on re-load; Play/Pause buttons and row clicks provide that gesture.

4. **Tracks without Spotify or YouTube** — `buildPlaybackEmbedUrl` returns `null`; player bar appears but no audio loads.

---

## Files changed

- `src/context/PlaybackContext.tsx` — unified state, persistent iframe, `playNow` / `togglePlayPause`
- `src/lib/music/playback.ts` — `syncPlaybackEmbed()`
- `src/components/music/GlobalPlayer.tsx` — UI only, iframe removed
- `src/components/music/MusicActions.tsx` — active vs inactive play behavior
- `src/components/music/TrackRow.tsx` — `playNow` on row click
- `src/components/home/TodaysDiscovery.tsx` — `playNow` on discovery track

---

## Manual test plan

1. Open an artist page with top tracks.
2. Click track title once → bottom player appears, audio starts.
3. Click Play/Pause in bottom bar → pauses and resumes.
4. Click a different track → switches immediately, previous audio stops.
5. Click compact Play on inactive row → starts that track.
6. Click Pause on active row’s compact button → pauses.
7. Click “View details” (maximize) → modal opens; playback continues without requiring modal first.
8. Home “Today’s discovery” track artwork/title → plays without modal.
