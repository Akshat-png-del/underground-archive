# Playback UX Validation Report

**Date:** 2026-06-28  
**Scope:** Interaction and UX only — playback engine/architecture unchanged

---

## Clickable surfaces audited

| Surface | Whole-card play/pause/resume | Nested links isolated |
|---------|------------------------------|------------------------|
| `TrackRow` | Yes (`useCardPlayback`) | Artist link, `MusicActions` |
| `SetRow` | Yes | `MusicActions` when `showActions` |
| `SetCardEmbed` | Yes + keyboard | — |
| `SetDetail` embed | Via `SetCardEmbed` | Action buttons above |
| `EssentialSetOfDayHero` | Yes | View artist, `MusicActions` |
| `TodaysDiscovery` track/set cards | Yes | — |
| `PlaylistPageContent` rows | Yes | Artist link, actions |
| `SearchResults` | Yes | — |
| `HistoryPlayRow` | Yes | — |
| `ListeningPath` | Yes | — |
| `ReleaseCard` | Yes | `MusicActions` |

**Card toggle logic:** `useCardPlayback` now calls `togglePlayPause()` when the item is already active (paused → resume, playing → pause).

---

## Player interaction fixes

| Issue | Fix |
|-------|-----|
| Clicks passing through mini player | Outer shell `pointer-events-none`, inner bar `pointer-events-auto`, `z-[41]` above embed host |
| Seek scrubber missing | Added `PlaybackSeekBar` to mini player and expanded modal |
| Scrubber clicks propagating | `stopPropagation` on seek bar pointer/click events |
| Interactive controls cursor | `cursor-pointer` on player buttons and seek input |
| Expand closes on track switch | `play()` preserves `detailsOpen` when switching items |
| Expanded player interrupts playback | Modal close only calls `closeDetails()` — no `stop()` |

---

## Pointer-event fixes

- Global mini player: layered `pointer-events-none` / `pointer-events-auto`
- Expanded modal: `pointer-events-auto` on panel; backdrop click closes only modal
- Set card display iframes: remain `pointer-events-none` so card click drives global playback
- Body padding adjusted to `6.25rem` for seek bar height (content clearance only)

---

## Set embeds restored

| Location | Behavior |
|----------|----------|
| `SetDetail` | Embeds when `canShowSetVideoEmbed(youtubeId)` — valid 11-char ID |
| `SetCardEmbed` | Same; removed `shouldRenderSetEmbed` gate that hid valid videos |
| `SetRow` / heroes / discovery | YouTube iframe when valid ID; thumbnail only when no valid ID |
| Fallback copy | `"No archived set available."` |

Helper: `src/lib/music/set-display.ts` → `canShowSetVideoEmbed()`

---

## Visual clutter removed

| Removed | Location |
|---------|----------|
| "Listen on Spotify" | `ArtistPageContent` |
| "Watch on YouTube" | `ArtistPageContent` |
| Spotify listen buttons / copy | `ArtistMusicSection` empty states |
| Duplicate `MusicActions` under set cards | `ArtistMusicSection` |
| "Open in Spotify" / "Open in YouTube" | `PlayerModal` |
| "Spotify" outbound link | `PlaylistPageContent` |

Playback remains click-to-listen via cards and mini player.

---

## Controls verified

- Mini player: play/pause, expand, close, seek bar, full-page link
- Expanded modal: YouTube embed for sets, artwork for tracks, seek bar, view details
- Seeking: active when `duration > 0` (preview audio); scrubber captures pointer events regardless
- `MusicActions` on rows: still provides like/playlist via `stopCardPointerDown`

---

## Playback stability (unchanged architecture)

| Check | Status |
|-------|--------|
| One source at a time | Unchanged — engine singleton |
| Track switch stops previous | Unchanged |
| Track ↔ set switching | Unchanged |
| Navigation persistence | Unchanged — `PlaybackRoot` in layout |
| Duplicate iframe guard | Unchanged — engine invariant logs |

---

## Regressions introduced

**NO**

---

## Interaction pass 2 (pointer capture + modal + seek)

| Task | Fix |
|------|-----|
| Player z-index | Mini player `z-[9999]`, modal `z-[10000]` |
| Pointer capture | Full bar `pointer-events-auto`; `stopPropagation` on bar + controls |
| Click bar → modal | Clicking minimized player (non-control area) calls `openDetails()` |
| Modal lifecycle | Close only calls `closeDetails()` — playback continues |
| Track switch + modal | `play()` preserves `detailsOpen` |
| Seek bar | `stopPropagation` on pointer/click/touch; `data-player-control` marker |
| Seek duration | `usePlaybackDuration()` falls back to catalog track/set length |
| Provider labels | Already removed in prior pass (no Spotify/YouTube CTA text in UI) |

Playback engine, store architecture, and global styling tokens unchanged.

---

## Files modified

- `src/lib/music/use-card-playback.ts`
- `src/lib/music/set-display.ts` (new)
- `src/components/music/PlaybackSeekBar.tsx` (new)
- `src/components/music/GlobalPlayer.tsx`
- `src/components/music/PlayerModal.tsx`
- `src/components/music/SetRow.tsx`
- `src/components/artists/SetCard.tsx`
- `src/components/sets/SetDetail.tsx`
- `src/components/artists/ArtistMusicSection.tsx`
- `src/components/artists/ArtistPageContent.tsx`
- `src/components/library/PlaylistPageContent.tsx`
- `src/components/home/EssentialSetOfDayHero.tsx`
- `src/components/home/TodaysDiscovery.tsx`
- `src/stores/playback-store.ts` (preserve `detailsOpen` on play only)
