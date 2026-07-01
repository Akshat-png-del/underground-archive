# Playback UX Bug Fixes — Validation Report

Date: 2026-06-28

## Summary

Behavior-only fixes applied per critical playback UX requirements. No color, spacing, typography, or layout token changes beyond the explicitly requested floating player position.

| Requirement | Status |
|-------------|--------|
| YouTube branding removed from cards/surfaces | Fixed |
| Player click-through blocked | Fixed |
| Seek bar drives real playback position | Fixed |
| Bottom player bar removed | Fixed |
| Single floating right-side player window | Fixed |
| Window persists across navigation; close ≠ stop | Fixed |

---

## 1. YouTube Branding Removed

**Problem:** Set cards and playback surfaces showed YouTube embed chrome (red play button / branding).

**Fix:**
- Replaced display iframes with static thumbnails on `SetCard`, `SetRow`, `EssentialSetOfDayHero`, `TodaysDiscovery`.
- Added `setThumbnailUrl()` helper — uses archive `thumbnail` or `ytThumb(youtubeId)` fallback.
- Floating player shows `coverArt` only (no YouTube iframe in UI).
- `PlayerModal` updated to cover-art only (no longer mounted by default).

**Kept:** thumbnail, title, play controls. Playback still uses hidden off-screen engine embed.

---

## 2. Click-Through Fixed

**Fix:**
- `GlobalPlayer` is a single floating panel at `z-[9999]` with `pointer-events: auto` on container and inner surface.
- All pointer/click events call `stopPropagation()` on the panel.
- `PlaybackSeekBar` retains `data-player-control` and event isolation.
- Engine embed host moved off-screen (`left: -9999px`, `pointer-events: none`, `z-index: -1`) so hidden iframes never intercept clicks.

---

## 3. Seek Synchronization Fixed

**Problem:** Slider moved visually but embed modes did not seek.

**Fix in `global-player-engine.ts`:**
| Mode | Seek API |
|------|----------|
| Preview/audio | `audio.currentTime = seconds` |
| Spotify | `controller.seek(milliseconds)` |
| YouTube | `player.seekTo(seconds, true)` via YouTube IFrame API |

- Spotify `playback_update` now emits `position` / `duration` into store.
- YouTube player polls `getCurrentTime()` / `getDuration()` every 400ms while playing.
- Store `seek()` updates `currentTime` immediately before forwarding to engine.

---

## 4. Bottom Bar Removed

- Removed fixed `bottom-0` mini player bar.
- Removed `document.body.style.paddingBottom` compensation.
- No persistent bottom playback UI remains.

---

## 5. Floating Player Position

Single window when `currentTrack && detailsOpen`:

```
fixed right-6 top-1/2 -translate-y-1/2 z-[9999]
```

Opens automatically on any `play()` action (`detailsOpen: true`).

---

## 6. Window Behavior

| Scenario | Behavior |
|----------|----------|
| Switch track / artist / page | Window stays open (`detailsOpen` preserved or set true on play) |
| Close (X) | `closeDetails()` only — playback continues |
| Reopen | Click active card/play button when window closed → `openDetails()` |
| Duplicate windows | Impossible — single `GlobalPlayer` in `PlaybackRoot` |

---

## Manual Test Matrix

| Test | Expected | Code path |
|------|----------|-----------|
| Track A → B → C | Window stays open; audio switches | `play()` + engine `prepareForNewPlayback` |
| Track → Set | Window stays open; source resolves per type | `resolvePlaybackSource` |
| Set → Track | Same | Same |
| Seek forward | `currentTime` + audio position advance | `seek()` per mode |
| Seek backward | Same | Same |
| Rapid switching | No duplicate iframes | `purgeContainerMedia` |
| Pause / Resume | UI + engine sync | `togglePlayPause` |
| Page navigation | Window + playback persist | `PlaybackRoot` in layout |
| Background tab | Playback continues | Engine on `document.body` |
| Close window while playing | Audio continues; no UI | `closeDetails()` |
| Click active item when closed | Window reopens | `useCardPlayback` / `MusicActions` |

---

## Files Changed

- `src/lib/music/youtube-embed-api.ts` (new)
- `src/lib/music/global-player-engine.ts`
- `src/lib/music/spotify-embed-api.ts`
- `src/lib/music/set-display.ts`
- `src/lib/music/playback.ts`
- `src/lib/music/use-card-playback.ts`
- `src/stores/playback-store.ts`
- `src/components/music/GlobalPlayer.tsx`
- `src/components/music/PlayerModal.tsx`
- `src/components/artists/SetCard.tsx`
- `src/components/music/SetRow.tsx`
- `src/components/home/EssentialSetOfDayHero.tsx`
- `src/components/home/TodaysDiscovery.tsx`
- `src/components/music/MusicActions.tsx`

---

## Notes

- Hidden engine embed remains the single playback instance (`#vitalforge-playback-root`).
- YouTube playback now uses IFrame API (required for `seekTo`).
- Tracks without Spotify/YouTube/preview metadata remain unplayable (catalog gap, unchanged).
