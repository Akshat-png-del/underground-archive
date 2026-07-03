# Phase 14 — Spotify IFrame SDK Contract Audit

Generated: 2026-07-02T22:30:57.669Z

## 1. Which SDK/API is used?

| Field | Value |
|-------|-------|
| API | **Spotify IFrame API** (Embed Controller) |
| Script URL | `https://embed-cdn.spotifycdn.com/_next/static/iframe_api.50ee530a4fe8dcf56d43.js` |
| Integration file | `src/lib/music/spotify-embed-api.ts` |
| Provider | `src/lib/music/providers/spotify-provider.ts` |
| NOT used | Web Playback SDK, Spotify Web API player/seek |
| iframe src | `https://open.spotify.com/embed/track/0aMonkh8OKgqx1K0viRHRT?utm_source=iframe-api` |

## 2. Documented `EmbedController.seek()` semantics

Per [Spotify iFrame API reference](https://developer.spotify.com/documentation/embeds/references/iframe-api):

- Method: `EmbedController.seek(seconds)`
- Parameter: **`seconds` (integer)** — seconds into the loaded episode/track
- Return: **void / synchronous** — no Promise documented
- Example: `EmbedController.seek(200)` → seek to **200 seconds**

## 3. Required player state before seek

Documented prerequisites:
- Content must be **loaded** in the embed (`loadUri` / `loadEntity`)
- **`ready` event** must have fired (embed initialized)
- Runtime gate in integration: `host.isEmbedReady()` (= controller exists + `ready` listener fired)

No documented requirement that playback must be **playing** (vs paused) before seek.

## 4. Seek target units — contract vs integration

| Layer | Intended target | Value passed to `controller.seek()` |
|-------|-----------------|-----------------------------------|
| User seek | 16 seconds | — |
| SpotifyProvider | `target = 16` | `Math.round(target * 1000)` = **16000** |
| SpotifyEmbedHost | parameter name `positionMs` | **16000** (unchanged) |
| **Spotify IFrame API contract** | **`seek(seconds)` integer** | **16000 interpreted as 16000 seconds** |

**Track duration in capture:** ~29.713s. Passing **16000 seconds** far exceeds duration.

Official Web API note (different API): seeking past track length can jump to next/end behavior.

## 5. SDK callbacks around seek (runtime)

- t+1887ms **OTHER** `{"id":1,"ts":1813.6,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"command":"load","refId":"sara-landry::legacy","uri":"spotify:track:0aMonkh8OKgqx1K0viRHRT"}`
- t+1887ms **OTHER** `{"id":2,"ts":1813.8,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"patch","before":{"currentTime":0,"duration":0,"isPlaying":false,"isLoading":false},"after":{"currentTime":0,"duration":0,"isPlaying":false,"isLoading":true}}`
- t+3474ms **SDK_CALLBACK** `{"id":3,"ts":3444.9,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"event":"ready"}`
- t+3474ms **SDK_CALLBACK** `{"id":4,"ts":3445,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"event":"ready","payload":{}}`
- t+3474ms **OTHER** `{"id":5,"ts":3445.1,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"patch","before":{"currentTime":0,"duration":0,"isPlaying":false,"isLoading":true},"after":{"currentTime":0,"duration":0,"isPlaying":false,"isLoading":false}}`
- t+3477ms **OTHER** `{"id":6,"ts":3459,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"command":"startPlayback","refId":"sara-landry::legacy"}`
- t+3706ms **PLAYBACK_UPDATE** `{"id":7,"ts":3669.7,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"position":0,"positionMsRaw":0,"duration":null,"durationMsRaw":0,"paused":false,"buffering":true,"playingURI":"","trackId":null,"reason":null,"rawPayload":{"isPaused":false,"isBuffering":true,"duration":0,"position":0,"playingURI":""}}`
- t+3706ms **OTHER** `{"id":8,"ts":3670.2,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"playback_update","before":{"currentTime":0,"duration":0,"isPlaying":false,"isLoading":false},"after":{"currentTime":0,"duration":0,"isPlaying":true,"isLoading":true}}`
- t+4272ms **PLAYBACK_UPDATE** `{"id":9,"ts":4201.4,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"position":0,"positionMsRaw":0,"duration":29.713,"durationMsRaw":29713,"paused":false,"buffering":true,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT","trackId":null,"reason":null,"rawPayload":{"isPaused":false,"isBuffering":true,"duration":29713,"position":0,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT"}}`
- t+4272ms **OTHER** `{"id":10,"ts":4201.7,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"playback_update","before":{"currentTime":0,"duration":0,"isPlaying":true,"isLoading":true},"after":{"currentTime":0,"duration":29.713,"isPlaying":true,"isLoading":true}}`
- t+4273ms **OTHER** `{"id":11,"ts":4222.5,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"position":null,"duration":null,"paused":null,"trackId":null,"raw":{"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT"}}`
- t+4273ms **OTHER** `{"id":12,"ts":4222.7,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"playback_started","before":{"currentTime":0,"duration":29.713,"isPlaying":true,"isLoading":true},"after":{"currentTime":0,"duration":29.713,"isPlaying":true,"isLoading":false}}`
- t+4879ms **PLAYBACK_UPDATE** `{"id":13,"ts":4850.3,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"position":0,"positionMsRaw":0,"duration":29.713,"durationMsRaw":29713,"paused":false,"buffering":false,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT","trackId":null,"reason":null,"rawPayload":{"isPaused":false,"isBuffering":false,"duration":29713,"position":0,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT"}}`
- t+4879ms **OTHER** `{"id":14,"ts":4850.8,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"reason":"playback_update","before":{"currentTime":0,"duration":29.713,"isPlaying":true,"isLoading":false},"after":{"currentTime":0,"duration":29.713,"isPlaying":true,"isLoading":false}}`
- t+5289ms **PLAYBACK_UPDATE** `{"id":15,"ts":5247.7,"msSinceSeek":null,"followsSeek":false,"lastSeekTargetMs":null,"position":0.752,"positionMsRaw":752,"duration":29.713,"durationMsRaw":29713,"paused":false,"buffering":false,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT","trackId":null,"reason":null,"rawPayload":{"isPaused":false,"isBuffering":false,"duration":29713,"position":752,"playingURI":"spotify:track:0aMonkh8OKgqx1K0viRHRT"}}`

## 6. Raw payload comparison

_No playback_update captured before seek in this run._


### First `playback_update` AFTER seek

```json
{
  "id": 30,
  "ts": 8671.4,
  "msSinceSeek": 27.699999999720603,
  "followsSeek": true,
  "lastSeekTargetMs": 16000,
  "position": 3.955,
  "positionMsRaw": 3955,
  "duration": 29.713,
  "durationMsRaw": 29713,
  "paused": false,
  "buffering": false,
  "playingURI": "spotify:track:0aMonkh8OKgqx1K0viRHRT",
  "trackId": null,
  "reason": null,
  "rawPayload": {
    "isPaused": false,
    "isBuffering": false,
    "duration": 29713,
    "position": 3955,
    "playingURI": "spotify:track:0aMonkh8OKgqx1K0viRHRT"
  }
}
```

## 7. Is 0.11s derived or from SDK?

- SDK raw `data.position` (ms): **3955**
- Integration `spotifyPlaybackFields`: `position / 1000` = **3.955** seconds
- **Conclusion:** 3.955s is **derived** from SDK milliseconds field, not invented

## 8. Known SDK limitations (external)

- iFrame API `seek(seconds)` accepts **integer seconds only**; community reports sub-second truncation ([Spotify Community](https://community.spotify.com/t5/Spotify-for-Developers/IFrame-API-truncates-milliseconds-when-using-seek/td-p/7408550))
- iFrame API `play()` may be blocked by browser autoplay policies until user gesture
- iFrame API is **not** the Web Playback SDK (which uses `player.seek(position_ms)` Promise-based)
- `playback_update.position` and `.duration` are documented in **milliseconds**

## 9. Classification (evidence-based)

**Primary: incorrect use of the Spotify IFrame SDK**

The integration passes **16000** to `controller.seek()`, naming it milliseconds in code (`positionMs`, `requestedMs`, `targetMs`).
The Spotify IFrame API documents **`seek(seconds)`** — integer **seconds**.

16000 seconds >> track duration (29.713s) explains runtime behavior:
- SDK accepts call synchronously (no error)
- First `playback_update` reports unrelated position (~0.11s = ~110ms raw)
- Later updates report **duration** (~29713ms = end of track)

**Not primarily:** missing MSC/router lifecycle (upstream ruled out in Phases 10–13)

**Secondary SDK limitation:** integer-second seek granularity (would affect sub-second targets even after unit fix)