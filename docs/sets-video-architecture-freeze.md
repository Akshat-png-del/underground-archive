# Sets / Video Architecture Freeze

**Status: FROZEN — canonical and complete**

This document is the immutable contract for the Sets (YouTube) watch experience.
Unless a task explicitly says **Video**, **Sets**, or **YouTube**, do not change anything described here.

Last frozen: 2026-06-28

---

## Canonical video flow (do not change)

```
User clicks a Set (any browse surface)
  → router.push("/sets/[slug]")
  → SetWatchPage mounts
  → SetWatchSurface + useSetWatchDock
  → existing Playback Engine attaches to data-set-watch-host
  → YouTube Provider loads
  → native YouTube controls handle playback
```

There is **one** video entry path. Browse surfaces must **navigate** only — they must not call `playItem`, `togglePlayPause`, or other playback actions for sets.

---

## Absolute Rule #1 — Sets flow is complete

The current Sets / Video playback flow is the canonical implementation.

- Do **not** redesign, refactor, optimize, merge with the audio player, reuse components, move logic, or change lifecycle.
- Exception: explicit user request to change the Sets experience.

---

## Absolute Rule #2 — Two independent UI experiences

### Audio Experience

**Handles only:** music tracks, songs, Spotify, audio previews, external audio URLs.

**Owns only:** bottom player (`AudioPlayerBar`), queue, seek, next/previous, progress, volume, minimize, audio transport.

### Video Experience

**Handles only:** sets, YouTube videos, DJ mixes.

**Owns only:** `/sets/[slug]`, `SetWatchSurface`, native YouTube player, native YouTube controls, watch page UI.

**Does not own:** bottom player, queue, audio controls, track progress, Spotify controls.

---

## Absolute Rule #3 — No audio player UI during video

When a set or YouTube video is playing:

The audio player UI must **not** exist — not hidden, minimized, collapsed, mounted, rendered, animated, or occupying layout space.

Zero bottom player UI while the user is watching a set.

---

## Absolute Rule #4 — Audio player never controls video

Forbidden forever for YouTube sets:

`play()`, `pause()`, `next()`, `previous()`, `seek()`, progress updates, transport buttons, queue, timing, volume.

The native YouTube embed is the **only** controller.

---

## Absolute Rule #5 — Video never controls audio

The watch experience must never pause tracks, manage queue, show Spotify controls, or render audio transport.

The **only** shared layer is the playback engine (and its store, router, providers, session).

---

## Absolute Rule #6 — Audio work must not touch Sets files

Work on artists, albums, tracks, playlists, search, recommendations, library, audio player, UI redesign, animations, responsiveness, or themes must **not** modify any file in the Sets experience inventory (see below).

---

## Absolute Rule #7 — Pre-change checklist (playback-related files)

Before modifying any playback-related file, verify:

| Question | Required answer |
|----------|-----------------|
| Change affects audio only? | Yes |
| Sets watch page behaves exactly the same? | Yes |
| No Set component imported into audio player? | Yes |
| No audio component imported into Sets page? | Yes |
| No Set playback routing changed? | Yes |
| No new shared UI introduced? | Yes |

If any answer is **no**, stop and require explicit approval.

---

## Absolute Rule #8 — No architectural “cleanup”

Do **not** merge components, extract shared player UI, consolidate playback surfaces, simplify routing, reuse transport controls, unify layouts, or deduplicate audio/video UI.

Intentional separation is permanent.

---

## Absolute Rule #9 — Allowed shared modules

Only these modules may be shared between experiences:

| Module | Path |
|--------|------|
| Playback Engine | `src/lib/music/global-player-engine.ts` |
| Playback Store | `src/stores/playback-store.ts` |
| Provider Router | `src/lib/music/providers/provider-router.ts` |
| Provider implementations | `src/lib/music/providers/**` |
| Playback session / persistence | `src/lib/music/playback-persistence.ts`, store session fields |

Everything else remains experience-specific.

---

## Absolute Rule #10 — File scope discipline

- Do **not** open, refactor, or modify Sets/Video files unless the task explicitly targets Video, Sets, or YouTube.
- While working on the audio player, do **not** modify video components or set watch modules.

---

## Frozen Sets / Video file inventory

**Do not modify for audio-only or general UI work:**

```
src/app/sets/**
src/components/sets/**
src/lib/sets/set-watch-dock.ts
src/lib/sets/set-watch-navigation.ts
src/lib/sets/related-sets.ts
```

**Entry policy (frozen):** `src/lib/music/use-card-playback.ts` and `src/lib/music/playback-actions.ts` route sets to `/sets/[slug]` — do not restore direct set playback from browse surfaces.

**Experience boundary (frozen):** `src/lib/music/playback-experience.ts`

---

## Audio-only UI file inventory

**Safe to modify for audio / track work (do not import into Sets page):**

```
src/components/music/AudioPlayerBar.tsx
src/components/music/GlobalPlayer.tsx          # alias → AudioPlayerBar
src/components/music/PlaybackSeekBar.tsx
src/components/music/PlaybackQueuePanel.tsx
src/components/music/PlaybackVolumeControl.tsx
src/components/music/PlaybackExperienceDocument.tsx
src/components/music/PlaybackEngineMount.tsx   # audio fallback mount only
src/components/music/TrackRow.tsx
```

---

## Infrastructure (shared — change only with explicit approval + tests)

```
src/components/music/PlaybackRoot.tsx
src/lib/music/playback-actions.ts            # set guards are frozen policy
src/lib/music/player-controller.ts
src/lib/music/use-persistent-playback-dock.ts
```

Changes here must satisfy the Rule #7 checklist and must not alter Sets watch behavior.

---

## Agent instruction

When in doubt: **leave Sets/Video files untouched.**
