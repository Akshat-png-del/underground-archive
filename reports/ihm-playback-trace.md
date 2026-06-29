# IHM Playback Trace

Track: I Hate Models → Intergalactic Emotional Breakdown (`i-hate-models::intergalactic-emotional-breakdown`)

## Stages

| Stage | Result | Detail |
|-------|--------|--------|
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | track row found: #track-i-hate-models::intergalactic-emotional-breakdown |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | click logs captured (2) |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | currentTrack=i-hate-models::intergalactic-emotional-breakdown isPlaying=true isLoading=false error=null |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | engine logs=true iframe=true globalPlayer=true |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | iframe src: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1 |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | risks=none autoplay=true |
| function stage(name,passed,detail){stages.push({stage,passed,detail});console.log(`[${passed?"PASS":"FAIL"}] [${name}] ${detail}`)} | PASS | store reports isPlaying after embed load |

## Console pipeline logs

```
[MOUNT] PlaybackRoot mounted — initializing engine
[MOUNT] initializePlaybackEngine() starting
[MOUNT] mount() creating playback DOM
[MOUNT] engine mounted
[DOM] after mount {rootPresent: true, iframePresent: true, audioPresent: true, iframeSrc: about:blank, audioSrc: }
[DOM] embed audibility probe (post-mount) {iframeDimensions: Object, containerStyles: Object, iframeStyles: Object, inViewport: true, containerRect: Object}
[DOM] post-init probe {rootPresent: true, iframePresent: true, audioPresent: true, iframeSrc: about:blank, audioSrc: }
[MOUNT] PlaybackRoot init complete {rootPresent: true, iframePresent: true, audioPresent: true, iframeSrc: about:blank, audioSrc: }
[CLICK] card pointerdown {type: track, refId: i-hate-models::intergalactic-emotional-breakdown, title: Intergalactic Emotional Breakdown}
[CLICK] playNow() called from UI {type: track, refId: i-hate-models::intergalactic-emotional-breakdown, title: Intergalactic Emotional Breakdown}
[TRACK] Track ID i-hate-models::intergalactic-emotional-breakdown
[STORE] play() action dispatched {type: track, refId: i-hate-models::intergalactic-emotional-breakdown, title: Intergalactic Emotional Breakdown}
[STORE] state updated {currentTrack: i-hate-models::intergalactic-emotional-breakdown, isLoading: true, isPlaying: false}
[ENGINE] forwarding play to engine i-hate-models::intergalactic-emotional-breakdown
[MOUNT] engine already mounted — container styles refreshed
[DOM] embed audibility probe {iframeDimensions: Object, containerStyles: Object, iframeStyles: Object, inViewport: true, containerRect: Object}
[ENGINE] play requested {refId: i-hate-models::intergalactic-emotional-breakdown, type: track, generation: 1, listenerAttached: true}
[SOURCE] resolved {kind: spotify, sourceUrl: https://open.spotify.com/track/5dHDxDXEMaRjmf0wHZLBmy, embedUrl: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1, previewUrl: null, issue: null}
[LISTENER] engine → store patch {mode: idle, currentTrack: Object, isPlaying: false, isLoading: true, currentTime: 0}
[ENGINE] routing to embed iframe https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1
[ENGINE] iframe element ready {embedUrl: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1, generation: 1}
[LISTENER] engine → store patch {mode: embed, currentTrack: Object, isPlaying: false, isLoading: true, currentTime: 0}
[EMBED] setting iframe.src {from: about:blank, to: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1}
[DOM] after iframe.src set {rootPresent: true, iframePresent: true, audioPresent: true, iframeSrc: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1, audioSrc: }
[EMBED] iframe load event {generation: 1, src: https://open.spotify.com/embed/track/5dHDxDXEMaRjmf0wHZLBmy?utm_source=generator&autoplay=1, iframeDimensions: Object, containerStyles: Object, iframeStyles: Object}
[AUDIO] marking embed as playing (load complete) {refId: i-hate-models::intergalactic-emotional-breakdown}
[LISTENER] engine → store patch {mode: embed, currentTrack: Object, isPlaying: true, isLoading: false, currentTime: 0}
[DOM] Manual dump requested {dom: Object, audibility: Object, store: Object, ts: 1782686917312}
```
