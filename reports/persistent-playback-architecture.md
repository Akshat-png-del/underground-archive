# Persistent Playback Architecture

**Date:** 2026-06-28  
**Scope:** Route-persistent global audio, single player instance, state + queue persistence  
**Verdict:** Implemented via singleton DOM engine + root-level React context.

---

## Problem

Music stopped when users navigated between pages (artists, genres, search, home). Root causes:

1. **React-managed iframe** — The audio iframe lived inside `PlaybackProvider` as a React child. Any provider remount during navigation destroyed the iframe and stopped playback.
2. **`useLayoutEffect` re-sync** — An effect re-applied embed `src` on state reference changes, risking unnecessary reloads.
3. **Provider nesting** — `PlaybackProvider` was nested inside `LibraryProvider`, increasing remount surface area during library-driven re-renders.

---

## Solution overview

```
┌─────────────────────────────────────────────────────────────┐
│  app/layout.tsx (RootLayout)                                 │
│    AppProviders                                              │
│      PlaybackProvider          ← outermost; never unmounts   │
│        PersistentPlaybackMount                               │
│        GlobalPlayer            ← UI only                     │
│        LibraryProvider                                       │
│          …pages (children swap on route change)…             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  document.body                                               │
│    #vitalforge-playback-root   ← singleton, NOT React-owned  │
│      <iframe>  Spotify / YouTube embeds                      │
│      <audio>   HTML5 preview when previewUrl exists          │
└─────────────────────────────────────────────────────────────┘
```

Navigation only swaps `{children}` inside the provider tree. The singleton engine DOM nodes and `PlaybackProvider` state remain mounted.

---

## Components

| Layer | File | Role |
|-------|------|------|
| Singleton engine | `src/lib/music/playback-engine.ts` | One iframe + one audio element appended to `document.body`; survives React remounts |
| Persistence | `src/lib/music/playback-persistence.ts` | `localStorage` read/write for track, position, queue, play state |
| React state | `src/context/PlaybackContext.tsx` | `playNow`, `togglePlayPause`, `stop`, queue, position |
| DOM bootstrap | `src/components/music/PersistentPlaybackMount.tsx` | Calls `playbackEngine.ensureMounted()` once |
| UI | `src/components/music/GlobalPlayer.tsx` | Bottom bar; no audio element |
| Library bridge | `src/components/music/PlaybackLibraryBridge.tsx` | Records plays in library without coupling providers |
| Providers | `src/components/providers/Providers.tsx` | `PlaybackProvider` wraps entire app |

---

## State model

```typescript
{
  current: PlaybackItem | null;   // Now playing
  isPlaying: boolean;
  position: number;               // Seconds (HTML5 audio only)
  queue: PlaybackItem[];          // Up to 50 items, de-duped
  detailsOpen: boolean;
}
```

### Actions

| Action | Behavior |
|--------|----------|
| `playNow(item)` | Sets current, enqueues previous track, syncs engine synchronously in click handler |
| `togglePlayPause()` | Pauses/resumes without destroying engine session |
| `stop()` | Clears state, stops engine, clears `localStorage` |

### Engine modes

| Mode | When | Persistence across routes |
|------|------|---------------------------|
| `embed` | Spotify / YouTube URL available | Iframe `src` unchanged → playback continues |
| `audio` | `previewUrl` on track | `<audio>` element keeps buffer |
| `idle` | Stopped / paused embed cleared | N/A |

---

## Why navigation no longer interrupts playback

1. **Audio DOM is outside React** — `#vitalforge-playback-root` is created once by `playbackEngine.ensureMounted()` and never removed on route change.
2. **No navigation-triggered sync** — Removed `useLayoutEffect` that re-synced embed on every render cycle.
3. **Same-URL guard** — Engine skips iframe `src` updates when the embed URL is unchanged.
4. **Provider at root** — `PlaybackProvider` is the outermost client provider in `Providers.tsx`.
5. **Remount recovery** — On provider remount, hydration checks `playbackEngine.getSession()` first and reconciles React state with the still-playing engine.

---

## localStorage persistence (premium)

**Key:** `vitalforge:playback`

**Saved fields:**
- `current` — full `PlaybackItem`
- `isPlaying`
- `position`
- `queue`
- `updatedAt`

**When saved:** Debounced 400ms after state/position changes.

**On refresh:**
1. Load persisted state.
2. Restore track, queue, and position.
3. Attempt to resume if `isPlaying` was true (subject to browser autoplay policy — may require one extra Play click).

**Cleared on:** `stop()` or empty current track.

---

## Limitations (platform)

| Feature | Embed mode | Audio preview mode |
|---------|------------|-------------------|
| Position tracking | Not available (cross-origin iframe) | `timeupdate` on `<audio>` |
| Seek after refresh | Restarts embed | Seeks to saved `position` |
| Queue auto-advance | Not implemented | Could extend `ended` handler |

Catalog tracks currently use Spotify/YouTube embeds (`previewUrl` optional). Position persistence is fully accurate only when `previewUrl` is populated.

---

## Playback stops only when

1. User presses **Pause** or **Close (X)** on the global player  
2. User closes the browser tab/window  
3. User refreshes — optional restore from `localStorage` (autoplay may need user gesture)

---

## Files changed

- `src/lib/music/playback-engine.ts` (new)
- `src/lib/music/playback-persistence.ts` (new)
- `src/lib/music/playback.ts` — `previewUrl`, YouTube `enablejsapi`
- `src/context/PlaybackContext.tsx` — engine integration, queue, persistence
- `src/components/music/PersistentPlaybackMount.tsx` (new)
- `src/components/music/PlaybackLibraryBridge.tsx` (new)
- `src/components/providers/Providers.tsx` — `PlaybackProvider` outermost

---

## Manual verification

1. Play a track → bottom player appears, audio starts.
2. Navigate to `/discover`, `/artists/[slug]`, `/search`, `/` — audio continues, no restart.
3. Open another track — switches cleanly, single audio instance.
4. Pause → audio stops; navigate → stays paused.
5. Refresh page → last track + queue restored from `localStorage`.
6. Close player (X) → state cleared, `localStorage` cleared.
