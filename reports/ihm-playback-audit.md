# I Hate Models → Intergalactic Emotional Breakdown — Playback Audit

Generated: 2026-06-28

## Click path instrumentation

Pipeline logs use these tags (dev console or `localStorage.setItem('vf:playback-debug', '1')`):

| Stage | Where | What it confirms |
|-------|--------|------------------|
| `[CLICK]` | `use-card-playback`, `MusicActions`, `PlaybackContext` | Pointer/click reached handler |
| `[STORE]` | `playback-store.ts` `play()` | `currentTrack` set, engine forwarded |
| `[ENGINE]` | `global-player-engine.ts` | Engine received item, routed audio/embed |
| `[SOURCE]` | `resolvePlaybackSource()` | Spotify/YouTube URL resolved |
| `[EMBED]` | `startEmbed()` + iframe `load` | iframe created, `src` set, load fired |
| `[AUDIO]` | embed load / `audio.play()` | Playback state committed |

Re-run: `BASE_URL=http://localhost:3000 npx tsx scripts/trace-ihm-playback.ts`

## Trace result (automated)

All 7 stages **PASS** for `#track-i-hate-models::intergalactic-emotional-breakdown`.

Resolved source:
```
https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1
```

## Root cause of silent playback

**Break point: `[EMBED]` / `[AUDIO]` — embed loaded but browser did not output audio.**

The global Spotify iframe was positioned at `left: -9999px` (fully outside the viewport). The state machine correctly reached `isPlaying: true` on iframe `load`, but many browsers suppress or mute cross-origin embed playback for off-screen iframes even after a valid user gesture.

Earlier fix removed `opacity: 0.02` (which also killed audio) but moved the container off-screen, which had the same practical effect in real browsers.

### Fix (engine only — no GlobalPlayer UI change)

Repositioned `#vitalforge-playback-root` to:

- `position: fixed; left: 0; bottom: 5.25rem;`
- `width: 352px; height: 152px` (Spotify minimum)
- `z-index: 39` (under global player `z-40`, covered when bar is visible)
- Full opacity — no `display:none`, `visibility:hidden`, or `opacity` tricks

### Additional reliability fixes

1. **`initializePlaybackEngine()` called from `store.play()`** — engine + listener ready before first user click
2. **`useLayoutEffect` in `PlaybackRoot`** — earlier mount vs `useEffect`
3. **Sync engine snapshot after listener attach** — no stuck `isLoading` if play raced init
4. **Removed `preventDefault()` on card/MusicActions pointerdown** — preserves user-activation for autoplay

## Secondary UI cleanups (requested)

- YouTube display embeds: `controls=0&modestbranding=1` — hides red YouTube play chrome on set cards
- Removed play-icon overlays on set card video faces
- Removed redundant “Listen on Spotify” section below tracks on artist pages

## Manual verification

1. Hard-refresh (`Cmd+Shift+R`) to clear old `#vitalforge-playback-root` DOM
2. Open `/artists/i-hate-models`
3. Click anywhere on **Intergalactic Emotional Breakdown**
4. DevTools console should show `[CLICK]` → `[STORE]` → `[ENGINE]` → `[SOURCE]` → `[EMBED]` → `[AUDIO]`
5. Run `window.__playbackDebugDump()` — confirm `audibility.inViewport === true` and `audibilityRisk: []`
6. Confirm audible Spotify playback (tab/system volume up)
