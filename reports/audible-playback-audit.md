# Audible Playback Audit — Spotify / YouTube Embeds

**Generated:** 2026-06-28T21:52:25.396Z
**Base URL:** http://localhost:3000

## Root cause (pre-fix)

The global embed container in `global-player-engine.ts` used:

```
position: fixed; bottom: 5.25rem; left: 0;
width: 352px; height: 152px;
opacity: 0.02;  /* ← audible playback killer */
z-index: 35;
```

Browsers treat near-zero opacity embeds as effectively hidden and may suppress or mute cross-origin media playback even when `isPlaying: true` and `embed load success` fire.

## Fix applied (engine only — no GlobalPlayer UI changes)

```
position: fixed;
left: -9999px;
top: 0;
width: 352px;
height: 152px;
/* no opacity, display:none, or visibility:hidden on embed container */
z-index: -1;
```

Iframe remains **352×152** (Spotify minimum). No `sandbox`. `allow` includes `autoplay`.

## 10-point investigation checklist

| # | Question | Pre-fix | Post-fix |
|---|----------|---------|----------|
| 1 | Is Spotify iframe hidden? | **YES** — `opacity: 0.02` on container | **NO** — full opacity, offscreen |
| 2 | Outside viewport? | Partially visible at bottom-left | **YES** — intentionally offscreen (`left: -9999px`) |
| 3 | Width/height too small? | **NO** — 352×152 | **NO** — 352×152 |
| 4 | `display:none`? | **NO** | **NO** |
| 5 | `visibility:hidden`? | **NO** | **NO** |
| 6 | `opacity:0` preventing playback? | **YES** — `opacity: 0.02` | **NO** |
| 7 | Autoplay blocked (URL)? | **NO** — `autoplay=1` in embed URL | **NO** |
| 8 | Sandbox preventing audio? | **NO** — no sandbox attr | **NO** |
| 9 | Iframe muted? | **NO** — no muted attr | **NO** |
| 10 | Iframe removed after load? | **NO** — stays connected | **NO** |

## Scenario results

### Spotify track — Legacy

- **Provider:** spotify
- **Store isPlaying:** true
- **Audibility risks:** _none_

### YouTube set — Boiler Room x Teletech Festival 2023

- **Provider:** youtube
- **Store isPlaying:** true
- **Audibility risks:** _none_

## Audible playback verification

| Check | Result |
|-------|--------|
| State machine isPlaying | PASS |
| Post-fix audibility risks | PASS — no CSS/attr blockers |
| Headless audible confirmation | **NOT POSSIBLE** — cross-origin Spotify/YouTube audio cannot be sampled in Playwright |

### Manual verification steps

1. Hard-refresh the app (clears old `#vitalforge-playback-root` with `opacity: 0.02`).
2. Click a track with a Spotify URL.
3. Run `window.__playbackDebugDump()` in DevTools.
4. Confirm `audibility.checks.opacityZero === false` and `audibility.audibilityRisk` is `[]`.
5. Confirm audio is audible (volume up, not muted tab).

### Notes

- **YouTube** may still block *unmuted* autoplay in some browsers even with a user gesture; Spotify embeds are the primary path for tracks.
- `<audio>` preview elements still use `display:none` — only used for `previewUrl` tracks, not Spotify/YouTube embeds.
- Offscreen positioning (`left: -9999px`) is intentional per embed-audio best practice; do not revert to `opacity: 0.02`.