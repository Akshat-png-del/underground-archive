# Phase 13 — Spotify Provider Root Cause Audit

Generated: 2026-07-03T06:13:37.299Z
Seek target: **16.4s**
Capture: **8000ms** after commitSeek EXIT

## Timeline

- t+-197ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 22, ts: 8487.2, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+-197ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 23, ts: 8487.5, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+-5ms — GlobalPlayerEngine.seek: [TRACE] GlobalPlayerEngine.seek ENTER {id: 345, ts: 8679.4, fn: GlobalPlayerEngine.seek, kind: ENTER, seconds: 16.4}
- t+-4ms — GlobalPlayerEngine.seek: [TRACE] GlobalPlayerEngine.seek → ProviderRouter.seek {id: 346, ts: 8679.6, fn: GlobalPlayerEngine.seek, kind: INVOKE, next: ProviderRouter.seek}
- t+-4ms — ProviderRouter.seek: [TRACE] ProviderRouter.seek ENTER {id: 347, ts: 8679.8, fn: ProviderRouter.seek, kind: ENTER, positionSeconds: 16.4}
- t+-4ms — ProviderRouter.seek: [TRACE] ProviderRouter.seek → active.seek(spotify) {id: 348, ts: 8679.9, fn: ProviderRouter.seek, kind: INVOKE, next: active.seek(spotify)}
- t+-4ms — SpotifyProvider.seek: [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 24, ts: 8680.4, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+-4ms — SpotifyProvider.seek: [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 25, ts: 8680.5, msSinceSeek: 0, followsSeek: true, lastSeekTargetMs: 16400}
- t+-4ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 26, ts: 8680.6, msSinceSeek: 0.09999999962747097, followsSeek: true, lastSeekTargetMs: 16400}
- t+0ms — host.seekIfReady: [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 27, ts: 8683, msSinceSeek: 2.5, followsSeek: true, lastSeekTargetMs: 16400}
- t+0ms — host.seekIfReady: [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 28, ts: 8683.2, msSinceSeek: 2.700000001117587, followsSeek: true, lastSeekTargetMs: 16400}
- t+0ms — host.seekIfReady: [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 29, ts: 8683.3, msSinceSeek: 2.800000000745058, followsSeek: true, lastSeekTargetMs: 16400}
- t+0ms — SpotifyProvider.seek: [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 30, ts: 8683.4, msSinceSeek: 2.900000000372529, followsSeek: true, lastSeekTargetMs: 16400}
- t+0ms — ProviderRouter.seek: [TRACE] ProviderRouter.seek EXIT {id: 353, ts: 8683.6, fn: ProviderRouter.seek, kind: EXIT, positionSeconds: 16.4}
- t+0ms — GlobalPlayerEngine.seek: [TRACE] GlobalPlayerEngine.seek EXIT {id: 354, ts: 8683.7, fn: GlobalPlayerEngine.seek, kind: EXIT, seconds: 16.4}
- t+0ms — commitSeek EXIT: [TRACE] MediaSessionController.commitSeek EXIT {id: 355, ts: 8683.7, fn: MediaSessionController.commitSeek, kind: EXIT, target: 16.4}
- t+32ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 31, ts: 8712, msSinceSeek: 31.5, followsSeek: true, lastSeekTargetMs: 16400}
- t+32ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 32, ts: 8712.3, msSinceSeek: 31.800000000745058, followsSeek: true, lastSeekTargetMs: 16400}
- t+820ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 33, ts: 9503.8, msSinceSeek: 823.3000000007451, followsSeek: true, lastSeekTargetMs: 16400}
- t+821ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 34, ts: 9504.4, msSinceSeek: 823.9000000003725, followsSeek: true, lastSeekTargetMs: 16400}
- t+1885ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 35, ts: 10567.1, msSinceSeek: 1886.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+1886ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 36, ts: 10568.1, msSinceSeek: 1887.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+2948ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 37, ts: 11630.1, msSinceSeek: 2949.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+2951ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 38, ts: 11631, msSinceSeek: 2950.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+4010ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 39, ts: 12692.6, msSinceSeek: 4012.0999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+4010ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 40, ts: 12693.6, msSinceSeek: 4013.0999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+5071ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 41, ts: 13753.9, msSinceSeek: 5073.4000000003725, followsSeek: false, lastSeekTargetMs: 16400}
- t+5072ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 42, ts: 13754.6, msSinceSeek: 5074.0999999996275, followsSeek: false, lastSeekTargetMs: 16400}
- t+6136ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 43, ts: 14818.4, msSinceSeek: 6137.9000000003725, followsSeek: false, lastSeekTargetMs: 16400}
- t+6137ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 44, ts: 14819.1, msSinceSeek: 6138.5999999996275, followsSeek: false, lastSeekTargetMs: 16400}
- t+7201ms — playback_update: [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 45, ts: 15880.2, msSinceSeek: 7199.700000001118, followsSeek: false, lastSeekTargetMs: 16400}
- t+7201ms — provider state patch: [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 46, ts: 15881.2, msSinceSeek: 7200.700000001118, followsSeek: false, lastSeekTargetMs: 16400}

## playback_update positions after seek

| t+ms | position | followsSeek | msSinceSeek |
|------|----------|-------------|-------------|
| -197 | ? | false | ? |
| 32 | ? | true | 31.5 |
| 820 | ? | true | 823.3000000007451 |
| 1885 | ? | true | 1886.5999999996275 |
| 2948 | ? | true | 2949.5999999996275 |
| 4010 | ? | true | 4012.0999999996275 |
| 5071 | ? | false | 5073.4000000003725 |
| 6136 | ? | false | 6137.9000000003725 |
| 7201 | ? | false | 7199.700000001118 |

## Commands within 500ms after seek (router + provider)

_none observed_

## Explicit answers (runtime evidence only)

**Did Spotify receive the requested seek?** NO EVIDENCE — host.seekIfReady early return or not logged

**Did seek() return success?** UNKNOWN

**Did another command execute within 500ms after seek?** NO — no play/resume/load/pause command logged within 500ms

**Which playback_update first diverges from 16.4s?** None within capture (or no playback_update events)

**Is provider emitting 29.713 or wrapper transforming?** See STATE_PATCH vs PLAYBACK_UPDATE — if PLAYBACK_UPDATE raw payload shows position=29713ms, **SDK emits it**; if only STATE_PATCH from seek_optimistic_patch, **provider local patch**

**SDK rejecting seek or accepting then overriding?** Insufficient evidence

**Spotify error ignored?** No playback_error or exception logged

## Full Spotify audit log

- t+ -197ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 22, ts: 8487.2, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+ -197ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 23, ts: 8487.5, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+   -4ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 24, ts: 8680.4, msSinceSeek: null, followsSeek: false, lastSeekTargetMs: null}
- t+   -4ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 25, ts: 8680.5, msSinceSeek: 0, followsSeek: true, lastSeekTargetMs: 16400}
- t+   -4ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 26, ts: 8680.6, msSinceSeek: 0.09999999962747097, followsSeek: true, lastSeekTargetMs: 16400}
- t+    0ms [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 27, ts: 8683, msSinceSeek: 2.5, followsSeek: true, lastSeekTargetMs: 16400}
- t+    0ms [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 28, ts: 8683.2, msSinceSeek: 2.700000001117587, followsSeek: true, lastSeekTargetMs: 16400}
- t+    0ms [SPOTIFY-SEEK-AUDIT] SpotifyEmbedHost HOST_SEEK {id: 29, ts: 8683.3, msSinceSeek: 2.800000000745058, followsSeek: true, lastSeekTargetMs: 16400}
- t+    0ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider SEEK {id: 30, ts: 8683.4, msSinceSeek: 2.900000000372529, followsSeek: true, lastSeekTargetMs: 16400}
- t+   32ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 31, ts: 8712, msSinceSeek: 31.5, followsSeek: true, lastSeekTargetMs: 16400}
- t+   32ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 32, ts: 8712.3, msSinceSeek: 31.800000000745058, followsSeek: true, lastSeekTargetMs: 16400}
- t+  820ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 33, ts: 9503.8, msSinceSeek: 823.3000000007451, followsSeek: true, lastSeekTargetMs: 16400}
- t+  821ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 34, ts: 9504.4, msSinceSeek: 823.9000000003725, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 1885ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 35, ts: 10567.1, msSinceSeek: 1886.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 1886ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 36, ts: 10568.1, msSinceSeek: 1887.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 2948ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 37, ts: 11630.1, msSinceSeek: 2949.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 2951ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 38, ts: 11631, msSinceSeek: 2950.5999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 4010ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 39, ts: 12692.6, msSinceSeek: 4012.0999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 4010ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 40, ts: 12693.6, msSinceSeek: 4013.0999999996275, followsSeek: true, lastSeekTargetMs: 16400}
- t+ 5071ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 41, ts: 13753.9, msSinceSeek: 5073.4000000003725, followsSeek: false, lastSeekTargetMs: 16400}
- t+ 5072ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 42, ts: 13754.6, msSinceSeek: 5074.0999999996275, followsSeek: false, lastSeekTargetMs: 16400}
- t+ 6136ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 43, ts: 14818.4, msSinceSeek: 6137.9000000003725, followsSeek: false, lastSeekTargetMs: 16400}
- t+ 6137ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 44, ts: 14819.1, msSinceSeek: 6138.5999999996275, followsSeek: false, lastSeekTargetMs: 16400}
- t+ 7201ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider PLAYBACK_UPDATE {id: 45, ts: 15880.2, msSinceSeek: 7199.700000001118, followsSeek: false, lastSeekTargetMs: 16400}
- t+ 7201ms [SPOTIFY-SEEK-AUDIT] SpotifyProvider STATE_PATCH {id: 46, ts: 15881.2, msSinceSeek: 7200.700000001118, followsSeek: false, lastSeekTargetMs: 16400}