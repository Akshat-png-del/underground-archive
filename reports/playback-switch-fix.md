# Playback Switch Fix Validation

Generated: 2026-06-28T23:25:42.344Z

## Root cause

1. **Reused iframe/audio DOM** — switching tracks only changed `iframe.src`; old Spotify/YouTube embeds could keep playing.
2. **Stacked embed load listeners** — each `play()` added new handlers without removing old ones, causing race desync.
3. **Store/engine desync on pause** — store waited for async engine events while UI toggled immediately.

## Fix

- **Destroy and recreate** iframe + audio on every new `play()`, pause (embed), resume, and stop.
- **Clear embed listeners** before rebinding; generation token rejects stale callbacks.
- **Store pause** sets `isPlaying: false` optimistically before engine teardown.

## Files modified

- `src/lib/music/global-player-engine.ts`
- `src/stores/playback-store.ts`
- `src/lib/music/playback-debug.ts` (added `[PLAYER]` log tag)

## Results (9/9)

| Test | Result | Detail |
|------|--------|--------|
| Sara Landry track plays | PASS | sara-landry::legacy playing=true |
| Kobosil replaces Sara | PASS | kobosil::intimacy-one iframe=https://open.spotify.com/embed/track/2L6iML8RAAq2Csyd5mA6Ya? |
| I Hate Models replaces Kobosil | PASS | i-hate-models::intergalactic-emotional-breakdown |
| Set replaces track | PASS | kobosil::boiler-room-berlin yt=true |
| Track replaces set | PASS | kobosil::intimacy-one |
| Rapid A→B→C→D — only D plays | PASS | expected i-hate-models::shades-of-night got i-hate-models::shades-of-night |
| Single iframe instance | PASS | iframes=1 audios=1 |
| Same track click pauses | PASS | isPlaying=false |
| Same track click resumes | PASS | isPlaying=true |

## [PLAYER] logs (sample)

```
[PLAYER] stopping old track {from: i-hate-models::intergalactic-emotional-breakdown, to: i-hate-models::two-steps-from-heaven}
[PLAYER] stopping old track {from: i-hate-models::intergalactic-emotional-breakdown, to: i-hate-models::two-steps-from-heaven}
[PLAYER] destroying old embed
[PLAYER] loading new source {refId: i-hate-models::two-steps-from-heaven, kind: spotify}
[PLAYER] playback started {refId: i-hate-models::two-steps-from-heaven, src: https://open.spotify.com/embed/track/11VfNXFzTxL23ar2XUo695?utm_source=generator&autoplay=1}
[PLAYER] stopping old track {from: i-hate-models::two-steps-from-heaven, to: i-hate-models::spirals-of-infinity}
[PLAYER] stopping old track {from: i-hate-models::two-steps-from-heaven, to: i-hate-models::spirals-of-infinity}
[PLAYER] destroying old embed
[PLAYER] loading new source {refId: i-hate-models::spirals-of-infinity, kind: spotify}
[PLAYER] playback started {refId: i-hate-models::spirals-of-infinity, src: https://open.spotify.com/embed/track/7CzGQZkhxl7TLtZ4VL1uMc?utm_source=generator&autoplay=1}
[PLAYER] stopping old track {from: i-hate-models::spirals-of-infinity, to: i-hate-models::shades-of-night}
[PLAYER] stopping old track {from: i-hate-models::spirals-of-infinity, to: i-hate-models::shades-of-night}
[PLAYER] destroying old embed
[PLAYER] loading new source {refId: i-hate-models::shades-of-night, kind: spotify}
[PLAYER] playback started {refId: i-hate-models::shades-of-night, src: https://open.spotify.com/embed/track/4NAZVNM9sk0CH6zFw92TJN?utm_source=generator&autoplay=1}
[PLAYER] stopping old track {reason: pause, refId: i-hate-models::shades-of-night}
[PLAYER] destroying old embed
[PLAYER] destroying old embed
[PLAYER] loading new source {refId: i-hate-models::shades-of-night, resume: true}
[PLAYER] playback started {refId: i-hate-models::shades-of-night, src: https://open.spotify.com/embed/track/4NAZVNM9sk0CH6zFw92TJN?utm_source=generator&autoplay=1}
```
