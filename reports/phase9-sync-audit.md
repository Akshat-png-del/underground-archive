# Phase 9 — Runtime State Synchronization Audit

Generated: 2026-07-02  
Runtime capture: `reports/playback-sync-audit.json`  
Instrumentation: `vf:sync-audit=1` via `scripts/playback-sync-audit.ts`

**No playback logic was modified.** Logging-only hooks in `playback-sync-audit.ts` and layer record points.

---

## 1. State ownership table

| Field | Authority (designed) | Actual runtime authority | Consumers |
|-------|---------------------|--------------------------|-----------|
| `currentTime` (playback) | Provider → Engine | **Split:** `useFinalPlaybackSnapshot` reads **Engine** when not scrubbing; MSC/Store hold reconciled copy | Snapshot → all UI; Store (mirror/tests/persist) |
| `currentTime` (scrub preview) | MSC UI session | MSC `seekPreviewTime` | Snapshot `displayTime` when `isSeeking` |
| `duration` | Provider → Engine | Engine (snapshot reads `engine.duration`) | Snapshot → SeekBar, labels |
| `isPlaying` | MSC transport intent | MSC (`transportIntent`, not raw provider) | Snapshot → transport buttons, rows |
| `volume` / `muted` | MSC (controller-owned) | MSC | Snapshot → `PlaybackVolumeControl` |
| `activeTrack` / queue | MSC session | MSC | Snapshot → bar, rows, queue panel |
| `error` / buffering | MSC reconciled | MSC | Snapshot → bar chrome |

---

## 2. Complete read graph

```
Provider (SpotifyProvider/AudioProvider state)
  ↓ emitState
GlobalPlayerEngine.getSnapshot()     ← engine mirrors provider each tick
  ↓ setStateListener
MediaSessionController.onEngineSnapshot → reconcileEngineSnapshot
  ↓ pushLegacyMirror
usePlaybackStore (Zustand mirror)     ← NOT used by UI components
  ↓
useFinalPlaybackSnapshot.toFinalSnapshot()
  ├─ source=engine → currentTime = engine.currentTime   ⚠ bypasses MSC
  └─ source=controller → mediaSessionDisplayTime(MSC)
  ↓ useSyncExternalStore (committedSnapshot cache)
UI components (useFinalPlaybackSnapshot)
  ↓ props
PlaybackSeekBar
  ├─ snapshot.displayTime, duration (from hook)
  ├─ draggingRef / previewRef (local duplicate)
  └─ mediaSessionController.getState() (trace helper only)
DOM (.sb-slider value, .sb-time text)  ← integer-floored derived display
```

### Per displayed value

| UI value | Chain |
|----------|-------|
| **Slider value** | Provider → Engine → Snapshot (`engine.currentTime` or preview) → `PlaybackSeekBar` floors to int → `<input value>` |
| **Elapsed label** | Same as slider (`Math.floor(displayTime)`) |
| **Duration label** | Provider → Engine → Snapshot → `Math.floor(duration)` |
| **Play/Pause visibility** | MSC `isPlaying` → Snapshot → `AudioTransportControls` CSS class toggle |
| **Volume slider** | MSC `volume`/`muted` → Snapshot → `PlaybackVolumeControl` |
| **Track title/art** | MSC `activeTrack` → Snapshot → `AudioPlayerBar` + `useNowPlayingMetadata` |
| **Row active/playing** | Snapshot `activeTrack` + `isPlaying` → `playbackItemActive/Playing` |

---

## 3. Duplicate state table

| Field | Locations | Risk |
|-------|-----------|------|
| `currentTime` | Provider, Engine snapshot, MSC transport, Store mirror, Snapshot (engine-sourced), SeekBar `previewRef`, DOM slider | **High** — 6 owners; snapshot intentionally ≠ MSC during playback |
| `duration` | Provider, Engine, MSC, Store, Snapshot, SeekBar `max` (floored) | Medium — integer floor in UI |
| `isPlaying` | Provider report, MSC intent, Snapshot | Low — MSC intent is authority |
| `volume`/`muted` | MSC only (+ Store mirror) | Low |
| `activeTrack` | Engine routing, MSC session, Store mirror, Snapshot | Low — MSC authoritative |
| `seekPreviewTime` | MSC UI session, Snapshot `displayTime` during scrub, SeekBar `previewRef` | Medium — two preview copies during drag |

---

## 4. First runtime divergence (evidence)

### Action: `after-play`
```
Provider  1.800
Engine    1.800
MSC       0.000   ← FIRST DIVERGENCE
Store     0.000
Snapshot  1.800   (source=engine, bypasses MSC)
UI        0       (slider not yet rendered/updated)
```

### Action: `after-pause`
```
Provider  1.996
Engine    1.996
MSC       1.800   ← FIRST DIVERGENCE (stale vs provider)
Store     1.800
Snapshot  1.996
UI        1       (Math.floor)
```

### Action: `after-resume`
```
Provider  3.333
Engine    3.333
MSC       1.996   ← FIRST DIVERGENCE
Store     1.996
Snapshot  3.333
UI        1
```

### Action: `after-seek-50pct` (most significant)
```
Provider  4.396
Engine    4.396
MSC       1.996   ← FIRST DIVERGENCE (stuck at pre-seek/pause position; isBuffering=true)
Store     1.996
Snapshot  4.396   (reads engine, not MSC)
UI        1       (DOM stale — 3 layers behind snapshot)
```

**Interpretation:** Synchronization first breaks at **`MediaSessionController` reconcile** — MSC `currentTime` does not follow provider/engine ticks while `useFinalPlaybackSnapshot` reads engine directly, so snapshot appears “correct” while MSC/store are stale. UI DOM lags snapshot due to integer flooring + React commit timing.

### Action: `after-next` / track switch
```
Provider/Engine/MSC/Store/Snapshot duration = 0 (loading)
UI duration = 1   ← FIRST DIVERGENCE (stale slider max from prior track)
```

---

## 5. Component audit

| Component | Hook / read path | Fields read | Local state / refs | Derived |
|-----------|------------------|-------------|-------------------|---------|
| `AudioPlayerBar` | `useFinalPlaybackSnapshot` | all snapshot | `expanded` useState, shellRef | `showBar`, experience |
| `AudioTransportControls` | snapshot prop | `isPlaying`, `queue`, `queueIndex`, `currentTime` | useCallback handlers | `canGoPrevious`, `canGoNext` |
| `PlaybackSeekBar` | snapshot prop + **MSC.getState()** (trace) | `displayTime`, `duration`, `activeTrack` | `draggingRef`, `previewRef`, `pointerEndCleanupRef`, `forceRender` | `sliderValue`, `elapsedLabel` (floored) |
| `PlaybackVolumeControl` | `useFinalPlaybackSnapshot` | `volume`, `muted`, `activeTrack` | none | `volumeSupported` from source resolver |
| `PlaybackQueuePanel` | `useFinalPlaybackSnapshot` | `queue`, `queueIndex`, `activeTrack` | `open` useState | — |
| `TrackRow` | `useFinalPlaybackSnapshot` | via `playbackItemActive/Playing` | `pendingPressRef` in hook | active/playing booleans |
| `SetRow`, `HistoryPlayRow`, `ListeningPath`, `ArtistMusicSection`, `SearchResults`, `MusicActions`, `SetCard`, `SetEditorialCard`, `EssentialSetOfDayHero`, `PlaylistPageContent` | `useFinalPlaybackSnapshot` | activeTrack, isPlaying | card press refs | active/playing |
| `SetWatchSurface` | `useFinalPlaybackSnapshot` | activeTrack match | — | set active check |
| `PlaybackEngineMount` | `useFinalPlaybackSnapshot` | `activeTrack.refId` only | — | — |
| `usePlaybackExperience` | `useFinalPlaybackSnapshot` | `activeTrack` | — | experience enum |
| `useCardPlayback` | **MSC.isActive** (dispatch only) | none for display | `pendingPressRef` | — |

**No UI component reads `usePlaybackStore` directly.**

---

## 6. Synchronization report

| Issue | Evidence | Type |
|-------|----------|------|
| **Competing time authorities** | Snapshot uses `engine.currentTime`; MSC/store use reconciled transport | Competing authorities |
| **MSC lag after pause/seek** | MSC `currentTime=1.996` while engine `4.396` after seek sample | Stale cache at MSC |
| **Snapshot bypasses MSC for time** | `toFinalSnapshot` `source=engine` when not scrubbing | By design, causes MSC≠snapshot |
| **Store mirrors stale MSC** | Store matches MSC, not engine | Delayed/stale mirror |
| **SeekBar integer flooring** | `Math.floor(displayTime)` → UI off by up to 0.99s | Derived truncation |
| **SeekBar local refs** | `previewRef` duplicates `seekPreviewTime` | Duplicated scrub state |
| **Committed snapshot cache** | `useSyncExternalStore` + `committedSnapshot` singleton | Memoized transport (1 frame behind possible) |
| **UI DOM vs snapshot** | After seek: snapshot=4.396, DOM slider=1 | React render lag / controlled input stale |
| **Duration on track switch** | UI slider max=1 while all layers=0 | Stale DOM until re-render |

---

## 7. Root cause ranking (likelihood)

1. **Dual authority in `useFinalPlaybackSnapshot.toFinalSnapshot`** — reads engine for `currentTime` while MSC/store maintain separate reconciled values. **Highest impact, proven in every sample.**

2. **MSC `reconcileEngineSnapshot` lag** — MSC `currentTime` stuck at last committed/pause value while provider advances. **First divergence layer in all play/pause/seek samples.**

3. **PlaybackSeekBar derived integer state** — floors time for slider/labels; DOM can lag snapshot by ≥1s. **UI symptom layer.**

4. **SeekBar `previewRef` / MSC `seekPreviewTime` duplication** — two scrub previews during drag.

5. **Store mirror propagates MSC staleness** — affects persistence/tests, not primary UI.

6. **awaitingEngineChangeSinceSeek module state** — can hold controller authority briefly after seek release (not primary diverger in these samples).

---

## Instrumentation (removable)

- `src/lib/music/playback-sync-audit.ts`
- Hooks: `provider-router.emitState`, `globalPlayerEngine.publish`, `MSC.onEngineSnapshot`, `toFinalSnapshot`, `__syncAuditSample` window hook
- Run: `BASE_URL=http://localhost:3000 npx tsx scripts/playback-sync-audit.ts`
