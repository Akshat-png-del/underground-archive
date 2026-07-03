# Seek Pipeline Runtime Trace

Generated: 2026-07-02T21:53:40.278Z
Base URL: http://localhost:3000

## Post-seek state

```json
{
  "ts": 1783029220241,
  "controller": {
    "currentTime": 29.713,
    "duration": 29.713,
    "isPlaying": true,
    "isSeeking": false,
    "seekPreviewTime": null,
    "hoverPreviewTime": null,
    "displayTime": 29.713
  },
  "engine": {
    "currentTime": 29.713,
    "duration": 29.713,
    "isPlaying": true,
    "isLoading": false,
    "refId": "sara-landry::legacy"
  },
  "store": {
    "currentTime": 29.713,
    "duration": 29.713,
    "isPlaying": true,
    "isLoading": false
  },
  "audio": null,
  "dom": {
    "rootPresent": true,
    "iframePresent": true,
    "audioPresent": false,
    "iframeSrc": "https://open.spotify.com/embed/track/0aMonkh8OKgqx1K0viRHRT?utm_source=iframe-api",
    "audioSrc": null,
    "audioPaused": null,
    "engineRootPresent": true,
    "globalPlayerPresent": true
  }
}
```

## Summary

- Trace lines captured: 133
- Functions ENTERED: 17
- Functions NEVER ENTERED: 5
- Early returns: 1
- Last ENTER/EXIT: PlaybackSeekBar.handleClick @ t+9169ms
- First pipeline fn never entered: PlaybackSeekBar.onPointerEnd

## Functions entered

- GlobalPlayerEngine.seek
- MediaSessionController.beginSeek
- MediaSessionController.commitSeek
- MediaSessionController.updateSeek
- MediaSessionUiSession.beginSeek
- MediaSessionUiSession.clearOnSeekCommit
- MediaSessionUiSession.updateSeek
- PlaybackSeekBar.attachPointerEndListeners
- PlaybackSeekBar.clearPointerEndListeners
- PlaybackSeekBar.commitDragSeek
- PlaybackSeekBar.detachPointerEndListeners
- PlaybackSeekBar.handleClick
- PlaybackSeekBar.handlePointerDown
- PlaybackSeekBar.handlePointerMove
- PlaybackSeekBar.handlePreviewMove
- ProviderRouter.seek
- SpotifyProvider.seek

## Functions never entered

- AudioProvider.seek
- MediaSessionController.seek
- PlaybackSeekBar.onPointerEnd
- PlaybackSeekBar.windowPointerEnd
- YoutubeProvider.seek

## Early returns

- t+9053ms **PlaybackSeekBar.handlePointerMove**
  `[TRACE] PlaybackSeekBar.handlePointerMove EARLY_RETURN {id: 63, ts: 9043.9, fn: PlaybackSeekBar.handlePointerMove, kind: EARLY_RETURN, reason: draggingRef.current === false} 
stack: at seekPipelineTra`

## Invocation chain

_none_

## Full timeline (chronological)

- t+ 1802ms [log] [SESSION] play() {refId: sara-landry::legacy, type: track}
- t+ 1805ms [log] [TRACE] PlaybackSeekBar.useEffect STATE {id: 1, ts: 1799.7, fn: PlaybackSeekBar.useEffect, kind: STATE, action: native listeners attached}
- t+ 1805ms [log] [TRACE] PlaybackSeekBar.useEffect STATE {id: 2, ts: 1800.5, fn: PlaybackSeekBar.useEffect, kind: STATE, action: native listeners detached}
- t+ 1806ms [log] [TRACE] PlaybackSeekBar.useEffect STATE {id: 3, ts: 1800.9, fn: PlaybackSeekBar.useEffect, kind: STATE, action: native listeners attached}
- t+ 6479ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 4, ts: 6467.6, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 0.753}
- t+ 6915ms [marker] === SEEK GESTURE START (element.dispatchEvent pointerdown/up) ===
- t+ 6919ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 5, ts: 6911.8, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.pointerdown}
- t+ 6920ms [log] [TRACE] PlaybackSeekBar.handlePointerDown ENTER {id: 6, ts: 6912.7, fn: PlaybackSeekBar.handlePointerDown, kind: ENTER, eventType: react.pointerdown}
- t+ 6920ms [log] [TRACE] PlaybackSeekBar.handlePointerDown BRANCH {id: 7, ts: 6913.5, fn: PlaybackSeekBar.handlePointerDown, kind: BRANCH, action: stopPropagation}
- t+ 6920ms [log] [TRACE] PlaybackSeekBar.handlePointerDown STATE {id: 8, ts: 6913.6, fn: PlaybackSeekBar.handlePointerDown, kind: STATE, dragging: true}
- t+ 6920ms [log] [TRACE] PlaybackSeekBar.handlePointerDown → mediaSessionController.beginSeek {id: 9, ts: 6913.7, fn: PlaybackSeekBar.handlePointerDown, kind: INVOKE, next: mediaSessionController.beginSeek}
- t+ 6920ms [log] [TRACE] MediaSessionController.beginSeek ENTER {id: 10, ts: 6913.8, fn: MediaSessionController.beginSeek, kind: ENTER, seconds: 0}
- t+ 6921ms [log] [TRACE] MediaSessionUiSession.beginSeek ENTER {id: 11, ts: 6914.0, fn: MediaSessionUiSession.beginSeek, kind: ENTER, seconds: 0}
- t+ 6921ms [log] [TRACE] MediaSessionUiSession.beginSeek EXIT {id: 12, ts: 6914.0, fn: MediaSessionUiSession.beginSeek, kind: EXIT, state: Object}
- t+ 6921ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 13, ts: 6914.2, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 0}
- t+ 6921ms [log] [TRACE] MediaSessionController.beginSeek EXIT {id: 14, ts: 6914.4, fn: MediaSessionController.beginSeek, kind: EXIT, ui: Object}
- t+ 6921ms [log] [TRACE] PlaybackSeekBar.handlePointerDown → attachPointerEndListeners {id: 15, ts: 6914.5, fn: PlaybackSeekBar.handlePointerDown, kind: INVOKE, next: attachPointerEndListeners}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners ENTER {id: 16, ts: 6914.6, fn: PlaybackSeekBar.attachPointerEndListeners, kind: ENTER, listenerGenBefore: 0}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners ENTER {id: 17, ts: 6914.8, fn: PlaybackSeekBar.clearPointerEndListeners, kind: ENTER, hadCleanup: false}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners EXIT {id: 18, ts: 6914.9, fn: PlaybackSeekBar.clearPointerEndListeners, kind: EXIT, listenerGen: 0}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners STATE {id: 19, ts: 6915.0, fn: PlaybackSeekBar.attachPointerEndListeners, kind: STATE, attached: Array(2)}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners EXIT {id: 20, ts: 6915.1, fn: PlaybackSeekBar.attachPointerEndListeners, kind: EXIT, listenerGen: 1}
- t+ 6922ms [log] [TRACE] PlaybackSeekBar.handlePointerDown EXIT {id: 21, ts: 6915.1, fn: PlaybackSeekBar.handlePointerDown, kind: EXIT, dragging: true}
- t+ 6968ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 22, ts: 6961.6, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.input}
- t+ 6968ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove ENTER {id: 23, ts: 6961.9, fn: PlaybackSeekBar.handlePreviewMove, kind: ENTER, eventType: react.input}
- t+ 6969ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove → mediaSessionController.updateSeek {id: 24, ts: 6962.1, fn: PlaybackSeekBar.handlePreviewMove, kind: INVOKE, next: mediaSessionController.updateSeek}
- t+ 6974ms [log] [TRACE] MediaSessionController.updateSeek ENTER {id: 25, ts: 6962.2, fn: MediaSessionController.updateSeek, kind: ENTER, seconds: 0}
- t+ 6975ms [log] [TRACE] MediaSessionUiSession.updateSeek ENTER {id: 26, ts: 6962.3, fn: MediaSessionUiSession.updateSeek, kind: ENTER, seconds: 0}
- t+ 6975ms [log] [TRACE] MediaSessionUiSession.updateSeek EXIT {id: 27, ts: 6962.4, fn: MediaSessionUiSession.updateSeek, kind: EXIT, state: Object}
- t+ 6975ms [log] [TRACE] MediaSessionController.updateSeek EXIT {id: 28, ts: 6962.6, fn: MediaSessionController.updateSeek, kind: EXIT, ui: Object}
- t+ 6975ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove EXIT {id: 29, ts: 6962.6, fn: PlaybackSeekBar.handlePreviewMove, kind: EXIT, previewRef: 0}
- t+ 7016ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 30, ts: 7009.3, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.pointerup}
- t+ 7016ms [log] [TRACE] PlaybackSeekBar.windowPointerEnd {id: 31, ts: 7009.5, listenerGen: 1, eventType: pointerup, isTrusted: false}
- t+ 7016ms [log] [TRACE] PlaybackSeekBar.onPointerEnd → commitDragSeek {id: 32, ts: 7009.7, fn: PlaybackSeekBar.onPointerEnd, kind: INVOKE, next: commitDragSeek}
- t+ 7016ms [log] [TRACE] PlaybackSeekBar.commitDragSeek ENTER {id: 33, ts: 7009.8, fn: PlaybackSeekBar.commitDragSeek, kind: ENTER, dragging: true}
- t+ 7016ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners ENTER {id: 34, ts: 7009.9, fn: PlaybackSeekBar.clearPointerEndListeners, kind: ENTER, hadCleanup: true}
- t+ 7017ms [log] [TRACE] PlaybackSeekBar.detachPointerEndListeners ENTER {id: 35, ts: 7010.0, fn: PlaybackSeekBar.detachPointerEndListeners, kind: ENTER, listenerGen: 1}
- t+ 7017ms [log] [TRACE] PlaybackSeekBar.detachPointerEndListeners EXIT {id: 36, ts: 7010.0, fn: PlaybackSeekBar.detachPointerEndListeners, kind: EXIT, listenerGen: 1}
- t+ 7017ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners EXIT {id: 37, ts: 7010.2, fn: PlaybackSeekBar.clearPointerEndListeners, kind: EXIT, listenerGen: 1}
- t+ 7017ms [log] [TRACE] PlaybackSeekBar.commitDragSeek → mediaSessionController.commitSeek {id: 38, ts: 7010.2, fn: PlaybackSeekBar.commitDragSeek, kind: INVOKE, next: mediaSessionController.commitSeek}
- t+ 7017ms [log] [TRACE] MediaSessionController.commitSeek ENTER {id: 39, ts: 7010.3, fn: MediaSessionController.commitSeek, kind: ENTER, seconds: 0}
- t+ 7017ms [log] [TRACE] MediaSessionController.commitSeek GUARD {id: 40, ts: 7010.7, fn: MediaSessionController.commitSeek, kind: GUARD, condition: nearCurrent skip}  stack: at seekPipelineTrace (http://localhost:3000/_next/static/chunks/_108mcta._.js:11472:64) | at MediaSessionController.commitSeek (http://localhost:3000/_next/static/chunks/_108mcta._.js:12488:182) | at PlaybackSeekBar.useCallback[commitDragSeek] (http://localhost:3000/_next/static/chunks/_108mcta._.js:16457:192) | at PlaybackSeekBar.useCallback[attachPointerEndListeners].onPointerEnd (http://localhost:3000/_next/static/chunks/_108mcta._.js:16491:21) | at InjectedScript.dispatchEvent (<anonymous>:7535:10)
- t+ 7017ms [log] [SESSION] commitSeek() {seconds: 0}
- t+ 7017ms [log] [TRACE] MediaSessionController.commitSeek → uiSession.clearOnSeekCommit {id: 41, ts: 7010.8, fn: MediaSessionController.commitSeek, kind: INVOKE, next: uiSession.clearOnSeekCommit}
- t+ 7017ms [log] [TRACE] MediaSessionUiSession.clearOnSeekCommit ENTER {id: 42, ts: 7010.9, fn: MediaSessionUiSession.clearOnSeekCommit, kind: ENTER, prior: Object}
- t+ 7017ms [log] [TRACE] MediaSessionUiSession.clearOnSeekCommit EXIT {id: 43, ts: 7010.9, fn: MediaSessionUiSession.clearOnSeekCommit, kind: EXIT, state: Object}
- t+ 7017ms [log] [TRACE] MediaSessionController.commitSeek → patchTransport {id: 44, ts: 7011.0, fn: MediaSessionController.commitSeek, kind: INVOKE, next: patchTransport}
- t+ 7017ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 45, ts: 7011.1, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 0}
- t+ 7018ms [log] [TRACE] MediaSessionController.commitSeek → globalPlayerEngine.seek {id: 46, ts: 7011.3, fn: MediaSessionController.commitSeek, kind: INVOKE, next: globalPlayerEngine.seek}
- t+ 7018ms [log] [TRACE] GlobalPlayerEngine.seek ENTER {id: 47, ts: 7011.4, fn: GlobalPlayerEngine.seek, kind: ENTER, seconds: 0}
- t+ 7018ms [log] [SEEK] engine seek requested {seconds: 0, mode: spotify}
- t+ 7018ms [log] [TRACE] GlobalPlayerEngine.seek → ProviderRouter.seek {id: 48, ts: 7011.6, fn: GlobalPlayerEngine.seek, kind: INVOKE, next: ProviderRouter.seek}
- t+ 7018ms [log] [TRACE] ProviderRouter.seek ENTER {id: 49, ts: 7011.6, fn: ProviderRouter.seek, kind: ENTER, positionSeconds: 0}
- t+ 7018ms [log] [TRACE] ProviderRouter.seek → active.seek(spotify) {id: 50, ts: 7011.7, fn: ProviderRouter.seek, kind: INVOKE, next: active.seek(spotify)}
- t+ 7018ms [log] [TRACE] SpotifyProvider.seek ENTER {id: 51, ts: 7011.9, fn: SpotifyProvider.seek, kind: ENTER, positionSeconds: 0}
- t+ 7018ms [log] [TRACE] MediaSessionController.onEngineSnapshot STATE {id: 52, ts: 7012.1, fn: MediaSessionController.onEngineSnapshot, kind: STATE, providerCurrentTime: 0}
- t+ 7019ms [log] [TRACE] SpotifyProvider.seek → host.seekIfReady {id: 53, ts: 7012.3, fn: SpotifyProvider.seek, kind: INVOKE, next: host.seekIfReady}
- t+ 7019ms [log] [TRACE] SpotifyProvider.seek EXIT {id: 54, ts: 7012.4, fn: SpotifyProvider.seek, kind: EXIT, target: 0}
- t+ 7019ms [log] [TRACE] ProviderRouter.seek EXIT {id: 55, ts: 7012.5, fn: ProviderRouter.seek, kind: EXIT, positionSeconds: 0}
- t+ 7019ms [log] [TRACE] GlobalPlayerEngine.seek EXIT {id: 56, ts: 7012.5, fn: GlobalPlayerEngine.seek, kind: EXIT, seconds: 0}
- t+ 7019ms [log] [TRACE] MediaSessionController.commitSeek EXIT {id: 57, ts: 7012.6, fn: MediaSessionController.commitSeek, kind: EXIT, target: 0}
- t+ 7019ms [log] [TRACE] PlaybackSeekBar.commitDragSeek EXIT {id: 58, ts: 7012.7, fn: PlaybackSeekBar.commitDragSeek, kind: EXIT, target: 0}
- t+ 7031ms [marker] === SEEK GESTURE END ===
- t+ 7538ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 59, ts: 7528.8, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 1.805}
- t+ 8597ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 60, ts: 8589.7, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 2.868}
- t+ 9033ms [marker] === SECOND GESTURE: page.mouse down/up at 75% ===
- t+ 9052ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 61, ts: 9042.2, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.pointermove}
- t+ 9053ms [log] [TRACE] PlaybackSeekBar.handlePointerMove ENTER {id: 62, ts: 9043.2, fn: PlaybackSeekBar.handlePointerMove, kind: ENTER, eventType: react.pointermove}
- t+ 9053ms [log] [TRACE] PlaybackSeekBar.handlePointerMove EARLY_RETURN {id: 63, ts: 9043.9, fn: PlaybackSeekBar.handlePointerMove, kind: EARLY_RETURN, reason: draggingRef.current === false}  stack: at seekPipelineTrace (http://localhost:3000/_next/static/chunks/_108mcta._.js:11472:64) | at handlePointerMove (http://localhost:3000/_next/static/chunks/_108mcta._.js:16581:186) | at executeDispatch (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:10329:13) | at runWithFiberInDEV (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:965:74) | at processDispatchQueue (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:10355:41)
- t+ 9058ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 64, ts: 9049.8, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.pointerdown}
- t+ 9058ms [log] [TRACE] PlaybackSeekBar.handlePointerDown ENTER {id: 65, ts: 9050.2, fn: PlaybackSeekBar.handlePointerDown, kind: ENTER, eventType: react.pointerdown}
- t+ 9059ms [log] [TRACE] PlaybackSeekBar.handlePointerDown BRANCH {id: 66, ts: 9050.5, fn: PlaybackSeekBar.handlePointerDown, kind: BRANCH, action: stopPropagation}
- t+ 9059ms [log] [TRACE] PlaybackSeekBar.handlePointerDown STATE {id: 67, ts: 9050.7, fn: PlaybackSeekBar.handlePointerDown, kind: STATE, dragging: true}
- t+ 9059ms [log] [TRACE] PlaybackSeekBar.handlePointerDown → mediaSessionController.beginSeek {id: 68, ts: 9050.8, fn: PlaybackSeekBar.handlePointerDown, kind: INVOKE, next: mediaSessionController.beginSeek}
- t+ 9059ms [log] [TRACE] MediaSessionController.beginSeek ENTER {id: 69, ts: 9051.0, fn: MediaSessionController.beginSeek, kind: ENTER, seconds: 2}
- t+ 9059ms [log] [TRACE] MediaSessionUiSession.beginSeek ENTER {id: 70, ts: 9051.2, fn: MediaSessionUiSession.beginSeek, kind: ENTER, seconds: 2}
- t+ 9060ms [log] [TRACE] MediaSessionUiSession.beginSeek EXIT {id: 71, ts: 9051.3, fn: MediaSessionUiSession.beginSeek, kind: EXIT, state: Object}
- t+ 9060ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 72, ts: 9051.5, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 2}
- t+ 9061ms [log] [TRACE] MediaSessionController.beginSeek EXIT {id: 73, ts: 9051.8, fn: MediaSessionController.beginSeek, kind: EXIT, ui: Object}
- t+ 9061ms [log] [TRACE] PlaybackSeekBar.handlePointerDown → attachPointerEndListeners {id: 74, ts: 9051.9, fn: PlaybackSeekBar.handlePointerDown, kind: INVOKE, next: attachPointerEndListeners}
- t+ 9061ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners ENTER {id: 75, ts: 9052.1, fn: PlaybackSeekBar.attachPointerEndListeners, kind: ENTER, listenerGenBefore: 1}
- t+ 9061ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners ENTER {id: 76, ts: 9052.2, fn: PlaybackSeekBar.clearPointerEndListeners, kind: ENTER, hadCleanup: false}
- t+ 9061ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners EXIT {id: 77, ts: 9052.4, fn: PlaybackSeekBar.clearPointerEndListeners, kind: EXIT, listenerGen: 1}
- t+ 9061ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners STATE {id: 78, ts: 9052.6, fn: PlaybackSeekBar.attachPointerEndListeners, kind: STATE, attached: Array(2)}
- t+ 9062ms [log] [TRACE] PlaybackSeekBar.attachPointerEndListeners EXIT {id: 79, ts: 9052.7, fn: PlaybackSeekBar.attachPointerEndListeners, kind: EXIT, listenerGen: 2}
- t+ 9062ms [log] [TRACE] PlaybackSeekBar.handlePointerDown EXIT {id: 80, ts: 9052.8, fn: PlaybackSeekBar.handlePointerDown, kind: EXIT, dragging: true}
- t+ 9081ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 81, ts: 9074.2, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.input}
- t+ 9082ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove ENTER {id: 82, ts: 9074.5, fn: PlaybackSeekBar.handlePreviewMove, kind: ENTER, eventType: react.input}
- t+ 9082ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove → mediaSessionController.updateSeek {id: 83, ts: 9074.6, fn: PlaybackSeekBar.handlePreviewMove, kind: INVOKE, next: mediaSessionController.updateSeek}
- t+ 9082ms [log] [TRACE] MediaSessionController.updateSeek ENTER {id: 84, ts: 9074.7, fn: MediaSessionController.updateSeek, kind: ENTER, seconds: 22}
- t+ 9082ms [log] [TRACE] MediaSessionUiSession.updateSeek ENTER {id: 85, ts: 9074.7, fn: MediaSessionUiSession.updateSeek, kind: ENTER, seconds: 22}
- t+ 9082ms [log] [TRACE] MediaSessionUiSession.updateSeek EXIT {id: 86, ts: 9074.8, fn: MediaSessionUiSession.updateSeek, kind: EXIT, state: Object}
- t+ 9082ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 87, ts: 9075.0, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 22}
- t+ 9082ms [log] [TRACE] MediaSessionController.updateSeek EXIT {id: 88, ts: 9075.1, fn: MediaSessionController.updateSeek, kind: EXIT, ui: Object}
- t+ 9083ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove EXIT {id: 89, ts: 9075.2, fn: PlaybackSeekBar.handlePreviewMove, kind: EXIT, previewRef: 22}
- t+ 9083ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove ENTER {id: 90, ts: 9075.4, fn: PlaybackSeekBar.handlePreviewMove, kind: ENTER, eventType: react.change}
- t+ 9083ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove → mediaSessionController.updateSeek {id: 91, ts: 9075.4, fn: PlaybackSeekBar.handlePreviewMove, kind: INVOKE, next: mediaSessionController.updateSeek}
- t+ 9083ms [log] [TRACE] MediaSessionController.updateSeek ENTER {id: 92, ts: 9075.5, fn: MediaSessionController.updateSeek, kind: ENTER, seconds: 22}
- t+ 9083ms [log] [TRACE] MediaSessionUiSession.updateSeek ENTER {id: 93, ts: 9075.6, fn: MediaSessionUiSession.updateSeek, kind: ENTER, seconds: 22}
- t+ 9083ms [log] [TRACE] MediaSessionUiSession.updateSeek EXIT {id: 94, ts: 9075.7, fn: MediaSessionUiSession.updateSeek, kind: EXIT, state: Object}
- t+ 9083ms [log] [TRACE] MediaSessionController.updateSeek EXIT {id: 95, ts: 9075.8, fn: MediaSessionController.updateSeek, kind: EXIT, ui: Object}
- t+ 9083ms [log] [TRACE] PlaybackSeekBar.handlePreviewMove EXIT {id: 96, ts: 9075.9, fn: PlaybackSeekBar.handlePreviewMove, kind: EXIT, previewRef: 22}
- t+ 9150ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 97, ts: 9143.0, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.pointerup}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.windowPointerEnd {id: 98, ts: 9143.2, listenerGen: 2, eventType: pointerup, isTrusted: true}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.onPointerEnd → commitDragSeek {id: 99, ts: 9143.3, fn: PlaybackSeekBar.onPointerEnd, kind: INVOKE, next: commitDragSeek}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.commitDragSeek ENTER {id: 100, ts: 9143.4, fn: PlaybackSeekBar.commitDragSeek, kind: ENTER, dragging: true}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners ENTER {id: 101, ts: 9143.4, fn: PlaybackSeekBar.clearPointerEndListeners, kind: ENTER, hadCleanup: true}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.detachPointerEndListeners ENTER {id: 102, ts: 9143.5, fn: PlaybackSeekBar.detachPointerEndListeners, kind: ENTER, listenerGen: 2}
- t+ 9151ms [log] [TRACE] PlaybackSeekBar.detachPointerEndListeners EXIT {id: 103, ts: 9143.5, fn: PlaybackSeekBar.detachPointerEndListeners, kind: EXIT, listenerGen: 2}
- t+ 9152ms [log] [TRACE] PlaybackSeekBar.clearPointerEndListeners EXIT {id: 104, ts: 9143.6, fn: PlaybackSeekBar.clearPointerEndListeners, kind: EXIT, listenerGen: 2}
- t+ 9152ms [log] [TRACE] PlaybackSeekBar.commitDragSeek → mediaSessionController.commitSeek {id: 105, ts: 9143.7, fn: PlaybackSeekBar.commitDragSeek, kind: INVOKE, next: mediaSessionController.commitSeek}
- t+ 9152ms [log] [TRACE] MediaSessionController.commitSeek ENTER {id: 106, ts: 9143.7, fn: MediaSessionController.commitSeek, kind: ENTER, seconds: 22}
- t+ 9152ms [log] [TRACE] MediaSessionController.commitSeek GUARD {id: 107, ts: 9144.0, fn: MediaSessionController.commitSeek, kind: GUARD, condition: nearCurrent skip}  stack: at seekPipelineTrace (http://localhost:3000/_next/static/chunks/_108mcta._.js:11472:64) | at MediaSessionController.commitSeek (http://localhost:3000/_next/static/chunks/_108mcta._.js:12488:182) | at PlaybackSeekBar.useCallback[commitDragSeek] (http://localhost:3000/_next/static/chunks/_108mcta._.js:16457:192) | at PlaybackSeekBar.useCallback[attachPointerEndListeners].onPointerEnd (http://localhost:3000/_next/static/chunks/_108mcta._.js:16491:21)
- t+ 9152ms [log] [SESSION] commitSeek() {seconds: 22}
- t+ 9152ms [log] [TRACE] MediaSessionController.commitSeek → uiSession.clearOnSeekCommit {id: 108, ts: 9144.1, fn: MediaSessionController.commitSeek, kind: INVOKE, next: uiSession.clearOnSeekCommit}
- t+ 9152ms [log] [TRACE] MediaSessionUiSession.clearOnSeekCommit ENTER {id: 109, ts: 9144.2, fn: MediaSessionUiSession.clearOnSeekCommit, kind: ENTER, prior: Object}
- t+ 9152ms [log] [TRACE] MediaSessionUiSession.clearOnSeekCommit EXIT {id: 110, ts: 9144.3, fn: MediaSessionUiSession.clearOnSeekCommit, kind: EXIT, state: Object}
- t+ 9152ms [log] [TRACE] MediaSessionController.commitSeek → patchTransport {id: 111, ts: 9144.3, fn: MediaSessionController.commitSeek, kind: INVOKE, next: patchTransport}
- t+ 9152ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 112, ts: 9144.4, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 22}
- t+ 9153ms [log] [TRACE] MediaSessionController.commitSeek → globalPlayerEngine.seek {id: 113, ts: 9144.7, fn: MediaSessionController.commitSeek, kind: INVOKE, next: globalPlayerEngine.seek}
- t+ 9153ms [log] [TRACE] GlobalPlayerEngine.seek ENTER {id: 114, ts: 9144.7, fn: GlobalPlayerEngine.seek, kind: ENTER, seconds: 22}
- t+ 9153ms [log] [SEEK] engine seek requested {seconds: 22, mode: spotify}
- t+ 9153ms [log] [TRACE] GlobalPlayerEngine.seek → ProviderRouter.seek {id: 115, ts: 9144.8, fn: GlobalPlayerEngine.seek, kind: INVOKE, next: ProviderRouter.seek}
- t+ 9153ms [log] [TRACE] ProviderRouter.seek ENTER {id: 116, ts: 9144.9, fn: ProviderRouter.seek, kind: ENTER, positionSeconds: 22}
- t+ 9153ms [log] [TRACE] ProviderRouter.seek → active.seek(spotify) {id: 117, ts: 9145.0, fn: ProviderRouter.seek, kind: INVOKE, next: active.seek(spotify)}
- t+ 9153ms [log] [TRACE] SpotifyProvider.seek ENTER {id: 118, ts: 9145.1, fn: SpotifyProvider.seek, kind: ENTER, positionSeconds: 22}
- t+ 9153ms [log] [TRACE] MediaSessionController.onEngineSnapshot STATE {id: 119, ts: 9145.3, fn: MediaSessionController.onEngineSnapshot, kind: STATE, providerCurrentTime: 22}
- t+ 9153ms [log] [TRACE] SpotifyProvider.seek → host.seekIfReady {id: 120, ts: 9145.4, fn: SpotifyProvider.seek, kind: INVOKE, next: host.seekIfReady}
- t+ 9153ms [log] [TRACE] SpotifyProvider.seek EXIT {id: 121, ts: 9145.6, fn: SpotifyProvider.seek, kind: EXIT, target: 22}
- t+ 9153ms [log] [TRACE] ProviderRouter.seek EXIT {id: 122, ts: 9145.7, fn: ProviderRouter.seek, kind: EXIT, positionSeconds: 22}
- t+ 9153ms [log] [TRACE] GlobalPlayerEngine.seek EXIT {id: 123, ts: 9145.8, fn: GlobalPlayerEngine.seek, kind: EXIT, seconds: 22}
- t+ 9153ms [log] [TRACE] MediaSessionController.commitSeek EXIT {id: 124, ts: 9145.8, fn: MediaSessionController.commitSeek, kind: EXIT, target: 22}
- t+ 9153ms [log] [TRACE] PlaybackSeekBar.commitDragSeek EXIT {id: 125, ts: 9145.9, fn: PlaybackSeekBar.commitDragSeek, kind: EXIT, target: 22}
- t+ 9167ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 126, ts: 9159.6, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.mouseup}
- t+ 9168ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 127, ts: 9160.6, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.change}
- t+ 9168ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 128, ts: 9161.0, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.lostpointercapture}
- t+ 9168ms [log] [TRACE] PlaybackSeekBar.nativeEvent NATIVE {id: 129, ts: 9161.1, fn: PlaybackSeekBar.nativeEvent, kind: NATIVE, eventType: native.click}
- t+ 9169ms [log] [TRACE] PlaybackSeekBar.handleClick ENTER {id: 130, ts: 9161.2, fn: PlaybackSeekBar.handleClick, kind: ENTER, eventType: react.click}
- t+ 9169ms [log] [TRACE] PlaybackSeekBar.handleClick EXIT {id: 131, ts: 9161.4, fn: PlaybackSeekBar.handleClick, kind: EXIT}
- t+ 9178ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 132, ts: 9168.8, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 2.868}
- t+ 9277ms [log] [TRACE] useFinalPlaybackSnapshot.commitFrame STATE {id: 133, ts: 9268.8, fn: useFinalPlaybackSnapshot.commitFrame, kind: STATE, displayTime: 29.713}