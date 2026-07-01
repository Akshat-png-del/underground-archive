# Critical Playback Regression — Root Cause Report

Generated: 2026-06-29

## Executive summary

Playback broke due to **UI-layer CSS and event handling** interfering with the engine, plus **queue index bugs** in the store. Engine/provider architecture was intact once the embed host was restored.

**Automated verification: 39/39 tests pass, architecture audit pass**

---

## Root causes

### 1. Engine embed moved off-screen (P0 — tracks & sets silent)

**File:** `src/app/globals.css`

```css
#vitalforge-playback-root { left: -10000px !important; ... }
```

This overrode engine inline styles with `!important`, hiding the Spotify/YouTube iframe from the browser’s audible viewport. Browsers block or fail autoplay/playback for off-screen embeds.

**Symptoms:** tracks don’t play, sets don’t play, seek appears visual-only, duration stuck.

**Fix:** Removed all `#vitalforge-playback-root` CSS overrides. Engine owns embed positioning (`bottom:0`, `opacity:1`, `visibility:visible`).

---

### 2. Capture-phase event handlers blocked player buttons (P0 — play/pause/seek)

**File:** `src/components/music/GlobalPlayer.tsx`

`onPointerDownCapture` + `stopPropagation()` on the shell **prevented child buttons from receiving pointer events**.

**Symptoms:** play/pause inconsistent, seek slider moves but clicks unreliable, minimize broken.

**Fix:** Removed capture-phase handlers. Use bubble-phase `stopPropagation` only.

Also removed `touch-action: none` on `.player-shell` (interfered with range input).

---

### 3. Queue index inverted + rebuild on navigation (P0 — prev/next broken)

**File:** `src/stores/playback-store.ts`

- New items were prepended at index `0` with `queueIndex: 0` → **previous always hit index -1**
- `buildQueue` removed target item when navigating back → corrupted queue

**Fix:**
- Append new items: `[history..., current]` with `queueIndex = length - 1`
- When `play(item, { queueIndex })` navigates to existing queue entry, **preserve queue** (no rebuild)
- Added `[QUEUE]` debug logs on play/next/previous

---

### 4. Prev/next disabled incorrectly in UI

**File:** `src/components/music/GlobalPlayer.tsx`

`disabled={queueLength < 2}` blocked buttons even when navigation was valid.

**Fix:** `canGoPrevious = queueIndex > 0 || currentTime > 3`, `canGoNext = queueIndex < queueLength - 1`

---

## Files modified

| File | Change |
|------|--------|
| `src/app/globals.css` | **Removed** engine host override + touch-action block |
| `src/stores/playback-store.ts` | Queue append model, navigation preserve, `[QUEUE]`/`[SEEK]` logs |
| `src/components/music/GlobalPlayer.tsx` | Fix pointer events; correct prev/next enablement |
| `src/lib/music/playback-actions.ts` | `[CLICK]` logs on all user actions |
| `src/lib/music/playback-debug.ts` | Added `PROVIDER`, `SEEK`, `QUEUE` log steps |
| `src/lib/music/global-player-engine.ts` | `[PROVIDER]`/`[SEEK]` logs (no behavior change except logging) |
| `tests/playback/contract.test.ts` | Queue navigation contract tests |

**Not modified for styling:** transparency, glassmorphism, card sizes, layout (per stabilization directive).

---

## Debug log map

Enable: `localStorage.setItem('vf:playback-debug', '1')`

| Tag | Layer |
|-----|-------|
| `[CLICK]` | playback-actions (user input) |
| `[STORE]` | playback-store |
| `[QUEUE]` | queue play/next/previous |
| `[SEEK]` | store + engine seek |
| `[ENGINE]` | global-player-engine |
| `[PROVIDER]` | spotify / youtube / audio path selection |
| `[SPOTIFY]` / `[AUDIO]` | provider events |

Dump state: `window.__playbackDebugDump()`

---

## Regressions fixed

| Issue | Status |
|-------|--------|
| Audio tracks play | ✓ embed restored |
| Set videos play | ✓ YouTube embed audible |
| Previous / next | ✓ queue model fixed |
| Play / pause | ✓ buttons receive events |
| Seek | ✓ engine seek path reachable (embed visible) |
| Duration | ✓ engine can report transport duration |
| Minimize / expand | ✓ collapse button receives clicks |
| Click-through | ✓ improved (no capture block) |

---

## Remaining issues (manual verify)

| Issue | Notes |
|-------|-------|
| **Dual visual surfaces** | Engine embed visible bottom-left (required for audibility) + GlobalPlayer UI right — intentional until dual-mode engine exists |
| **Transparency** | Deferred (Phase 5) until manual playback sign-off |
| **YouTube pause** | Engine destroys iframe on pause; resume reloads embed — verify manually |
| **545 tracks without metadata** | Catalog gap, not playback engine |
| **Set card thumbnails** | Sets use static thumbnails on cards; playback via global engine (not inline iframes) |

---

## Validation

```bash
npm run audit:playback-arch  # ✓
npm run test:playback        # ✓ 39/39
```

### Manual checklist

1. Play track A → audio starts
2. Switch to track B → switches
3. Pause → stops
4. Resume → continues
5. Seek → position changes audibly
6. Play a set (IHM, Sara Landry, Kobosil, Paula Temple)
7. Set → track switch
8. Navigate pages while playing
9. Collapse / expand player
10. Prev / next in queue after playing 2+ items

---

## Policy going forward

**No UI styling changes until manual playback sign-off.**

Allowed without review: bug fixes in store/engine/actions with contract tests.

Forbidden: CSS overrides on `#vitalforge-playback-root`, capture-phase handlers on player shell.
