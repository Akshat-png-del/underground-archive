# Playback Debug Trace Report

**Generated:** 2026-06-28  
**Scope:** Click → Zustand store → global engine → audio/iframe (debug instrumentation only, no UI changes)

---

## Summary

| Scenario | Chain stop point | User hears audio? |
|----------|------------------|-------------------|
| `/genres/hard-techno` track click | **COMPLETE** — embed load success | Unverified (headless) |
| Homepage `/` with onboarding open | **CLICK** — handler never fires | No |
| Homepage `/` after "Skip for now" | **COMPLETE** — embed load success | Unverified (headless) |
| Track missing Spotify/YouTube URL | **ENGINE** — `play failed` (console error) | No |

**Verdict: Pipeline software state is healthy on playable tracks when clicks reach handlers. The most likely real-world failure with zero playback console logs is the onboarding modal intercepting clicks on the homepage.**

---

## Instrumentation added (no UI/layout/styling changes)

| Layer | File | Log prefix |
|-------|------|------------|
| Click (TrackRow) | `src/components/music/TrackRow.tsx` | `[CLICK] Track clicked` |
| Click (MusicActions) | `src/components/music/MusicActions.tsx` | `[CLICK] MusicActions play clicked` |
| Click (all surfaces) | `src/context/PlaybackContext.tsx` | `[CLICK] playNow()`, `[TRACK] Track ID` |
| Store | `src/stores/playback-store.ts` | `[STORE] play/pause/resume/stop`, `[LISTENER]` |
| Engine | `src/lib/music/global-player-engine.ts` | `[ENGINE]`, `[SOURCE]`, `[RACE]`, `[MOUNT]` |
| Mount | `src/components/music/PlaybackRoot.tsx` | `[MOUNT] PlaybackRoot mounted` |
| Debug utils | `src/lib/music/playback-debug.ts` | `window.__playbackDebugDump()` |

Enable in production: `localStorage.setItem('vf:playback-debug', '1')` then reload.

---

## 10-point verification (genre page — playable track)

Test: click "Legacy" by Sara Landry on `/genres/hard-techno`

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Click handler firing | **PASS** | `[CLICK] Track clicked` |
| 2 | `play(track)` / `playNow` called | **PASS** | `[CLICK] playNow()`, `[TRACK] Track ID` |
| 3 | Zustand `play()` executing | **PASS** | `[STORE] play() action dispatched` |
| 4 | Engine receiving track | **PASS** | `[ENGINE] play requested` |
| 5 | Global player mounted | **PASS** | `globalPlayerPresent: true` post-click |
| 6 | Audio/iframe in DOM | **PASS** | `#vitalforge-playback-root` + iframe + audio |
| 7 | Source URL valid | **PASS** | Spotify embed URL with `autoplay=1` |
| 8 | Player survives navigation | N/A | Single-page click test |
| 9 | Race guards cancelling | **NO** | No `[RACE]` warnings |
| 10 | Immediate stop after play | **NO** | No `stop requested` after play |

**Chain stop point:** `COMPLETE — engine reported play success`

---

## Failure mode A — Homepage onboarding blocks clicks (CONFIRMED)

`OnboardingModal` renders `fixed inset-0 z-50` on `/` only (`HomePage.tsx`). It sits above all content including play buttons.

**Test without dismissing onboarding:**

```
HOME_BLOCKED: pointer events intercepted by onboarding overlay
[CLICK] logs: 0
store.currentTrack: null
```

The click **never reaches** `TrackRow.handlePlay` → `playNow` → `store.play`. No playback logs appear. No errors (playback code never runs).

**Test after clicking "Skip for now":**

```
[CLICK] logs: 2
store.isPlaying: true
iframeSrc: https://open.spotify.com/embed/track/...?autoplay=1
```

**How to confirm in your browser:**

1. Open `/` with fresh localStorage (or incognito).
2. Open DevTools console before clicking.
3. Click a track artwork while onboarding is visible.
4. Expect: **zero** `[CLICK]` / `[STORE]` / `[ENGINE]` logs.
5. Dismiss onboarding → click again → full log chain appears.

---

## Failure mode B — Track has no playback source

545 tracks / 160 releases lack Spotify or YouTube URLs in catalog.

When clicked, chain reaches engine then stops:

```
[SOURCE] resolved { kind: "none", embedUrl: null, issue: "Track missing Spotify or YouTube URL" }
[ENGINE] play failed — Track missing Spotify or YouTube URL
```

`playbackDebugError` always logs to console (not gated by debug flag).

---

## Failure mode C — Store early return (same track already playing)

```
[STORE] play() early return — already playing same item
```

Chain stops at store; engine not called again. Expected behavior, not a bug.

---

## Failure mode D — Audible output vs software state (UNCONFIRMED, needs manual check)

On playable Spotify tracks the automated trace shows:

- `store.isPlaying: true`
- `iframeSrc` = valid Spotify embed with `autoplay=1`
- Hidden iframe: `opacity: 0.02`, `pointer-events: none` (`global-player-engine.ts`)

The **state machine reports success** but headless/automated tests cannot confirm audible output. Spotify/YouTube may block autoplay inside near-invisible cross-origin iframes even when `isPlaying` is true.

**Manual check:** After click, run `window.__playbackDebugDump()` in console. If `isPlaying: true` and `iframeSrc` is a Spotify URL but you hear nothing, the break is at **embed autoplay / audibility**, not click → store → engine.

---

## Full console log chain (genre page — success path)

```
[MOUNT] PlaybackRoot mounted — initializing engine
[MOUNT] initializePlaybackEngine() starting
[MOUNT] mount() creating playback DOM
[MOUNT] engine mounted
[DOM] after mount { rootPresent: true, iframeSrc: about:blank, ... }
[DOM] post-init probe ...
[MOUNT] PlaybackRoot init complete ...
[CLICK] Track clicked { id: sara-landry::legacy, title: Legacy }
[CLICK] playNow() called from UI { type: track, refId: sara-landry::legacy, ... }
[TRACK] Track ID sara-landry::legacy
[STORE] play() action dispatched { type: track, refId: sara-landry::legacy, ... }
[STORE] state updated { currentTrack: sara-landry::legacy, isLoading: true, isPlaying: false }
[ENGINE] forwarding play to engine sara-landry::legacy
[ENGINE] play requested { refId: ..., generation: 1, listenerAttached: true }
[SOURCE] resolved { kind: spotify, embedUrl: https://open.spotify.com/embed/track/...?autoplay=1 }
[LISTENER] engine → store patch { isLoading: true, isPlaying: false }
[ENGINE] routing to embed iframe https://open.spotify.com/embed/track/...
[ENGINE] iframe element ready ...
[LISTENER] engine → store patch { mode: embed, isLoading: true }
[ENGINE] setting iframe.src { from: about:blank, to: https://open.spotify.com/embed/... }
[DOM] after iframe.src set { iframeSrc: https://open.spotify.com/embed/... }
[ENGINE] embed load success { generation: 1, src: ... }
[LISTENER] engine → store patch { isPlaying: true, isLoading: false }
```

---

## How to reproduce locally

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run debug:playback
# Report: reports/playback-debug-trace.md

# In browser console (any page):
window.__playbackDebugDump()
```

---

## Recommended next fix (out of scope for this debug pass)

1. **Onboarding vs playback:** Either persist `dismissOnboarding`, lower z-index, or allow pointer events through to play buttons under the overlay — homepage clicks currently never reach handlers.
2. **Audibility:** If `__playbackDebugDump()` shows playing but no sound, investigate Spotify embed autoplay policy for hidden iframes (separate from state-machine bugs).
3. **Catalog gaps:** 705 entities without sources will always fail at `[ENGINE] play failed`.

---

## Files changed (debug only)

- `src/lib/music/playback-debug.ts` (new)
- `src/lib/music/global-player-engine.ts`
- `src/stores/playback-store.ts`
- `src/context/PlaybackContext.tsx`
- `src/components/music/TrackRow.tsx`
- `src/components/music/MusicActions.tsx`
- `src/components/music/PlaybackRoot.tsx`
- `scripts/playback-debug-trace.ts` (new)
