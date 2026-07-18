<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Playback — Sets / Video architecture is FROZEN

**Read before any playback work:**
- [`docs/audio-video-sets-architecture-lock.md`](docs/audio-video-sets-architecture-lock.md) — three-domain lock (AUDIO | VIDEO | SETS)
- [`docs/sets-video-architecture-freeze.md`](docs/sets-video-architecture-freeze.md)

- Three independent domains: **Audio** (bottom player), **Video** (YouTube on watch page), **Sets** (navigation + UI only).
- Do **not** modify Sets/Video files unless the task explicitly says Video, Sets, or YouTube.
- Do **not** merge, refactor, or share transport UI between domains.
- Shared layer only: engine, store, provider router, providers, session.

Cursor rules: `.cursor/rules/architecture-domain-lock.mdc`, `.cursor/rules/sets-video-architecture-freeze.mdc`, `.cursor/rules/playback-architecture.mdc`, `.cursor/rules/playback-production-freeze.mdc`, `.cursor/rules/catalog-authenticity.mdc`, `.cursor/rules/catalog-curation-mode.mdc`

## Catalog — Curation Mode (media-first)

- Cleanup phase is complete. Grow via **verified ingestion** only — no mass cleanup, no invented media.
- Public catalog requires verified Spotify track(s) OR YouTube set(s) ≥10 min (API duration).
- Reintroduce removed legitimate artists only after Spotify track and/or verified long YouTube set.
- Success = authenticity + verified media, not artist count. Never touch frozen playback.
