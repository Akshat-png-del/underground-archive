# Play/Pause Pipeline Audit

Generated: 2026-07-02T23:17:24.129Z

## Answers

| # | Question | Result |
|---|----------|--------|
| 1 | First incorrect value | null |
| 2 | First incorrect layer | none observed |
| 3 | Play true before provider? | true (5 events) |
| 4 | Pause lags provider? | false (0 events) |
| 5 | Snapshot lags controller? | true |
| 6 | UI lags snapshot? | false |
| 7 | Duplicate play commands? | 0 |
| 8 | Duplicate pause commands? | 0 |
| 9 | playback_update overwrites transport? | true |
| 10 | Rapid play/pause race? | false |
| 11 | Stale playback_update after pause? | true |
| 12 | Persistent desync? | false |

## Samples

- **after-initial-play** @ 7867ms: msc=true engine=true store=true snapshot=true uiPlay=false uiPause=true
- **after-ui-pause** @ 10101ms: msc=false engine=false store=false snapshot=false uiPlay=true uiPause=false
- **after-ui-resume** @ 13352ms: msc=true engine=true store=true snapshot=true uiPlay=false uiPause=true
- **after-msc-pause** @ 15541ms: msc=false engine=false store=false snapshot=false uiPlay=true uiPause=false
- **after-msc-resume** @ 18729ms: msc=true engine=true store=true snapshot=true uiPlay=false uiPause=true
- **after-rapid-toggle** @ 22148ms: msc=true engine=true store=true snapshot=true uiPlay=false uiPause=true

## First 40 timeline events

- 479ms `MediaSessionController.applyReconciledTransport reconcile` msc=false engine=false provider=- snap=-
- 1841ms `MediaSessionPersistence.pushLegacyMirror store_mirror` msc=true engine=- provider=- snap=-
- 1842ms `useFinalPlaybackSnapshot.commitFrame snapshot_commit` msc=true engine=- provider=- snap=true
- 1843ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=false provider=- snap=-
- 4369ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=false provider=- snap=-
- 4603ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=true snap=-
- 4603ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 5419ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=true snap=-
- 5419ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 5430ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 6062ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=true snap=-
- 6062ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 6458ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=true snap=-
- 6458ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 7523ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=true snap=-
- 7523ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=true provider=- snap=-
- 7868ms `__playPauseTraceSample after-initial-play` msc=true engine=true provider=- snap=true
- 8081ms `MediaSessionController.pause ENTER` msc=true engine=true provider=- snap=-
- 8082ms `MediaSessionController.patchTransport transport_patch` msc=false engine=- provider=- snap=-
- 8082ms `MediaSessionPersistence.pushLegacyMirror store_mirror` msc=false engine=- provider=- snap=-
- 8082ms `useFinalPlaybackSnapshot.commitFrame snapshot_commit` msc=false engine=- provider=- snap=false
- 8082ms `GlobalPlayerEngine.pause ENTER` msc=- engine=true provider=true snap=-
- 8082ms `ProviderRouter.pause ENTER` msc=- engine=- provider=true snap=-
- 8082ms `SpotifyProvider.pause ENTER` msc=- engine=- provider=true snap=-
- 8082ms `MediaSessionController.applyReconciledTransport reconcile` msc=false engine=false provider=- snap=-
- 8082ms `SpotifyProvider.pause EXIT` msc=- engine=- provider=false snap=-
- 8082ms `ProviderRouter.pause EXIT` msc=- engine=- provider=false snap=-
- 8082ms `GlobalPlayerEngine.pause EXIT` msc=- engine=false provider=false snap=-
- 8082ms `MediaSessionController.pause EXIT` msc=false engine=false provider=- snap=-
- 8110ms `SpotifyProvider.onUpdate playback_update` msc=- engine=- provider=false snap=-
- 8110ms `MediaSessionController.applyReconciledTransport reconcile` msc=false engine=false provider=- snap=-
- 10104ms `__playPauseTraceSample after-ui-pause` msc=false engine=false provider=- snap=false
- 10333ms `MediaSessionController.resume ENTER` msc=false engine=false provider=- snap=-
- 10334ms `MediaSessionController.patchTransport transport_patch` msc=true engine=- provider=- snap=-
- 10334ms `MediaSessionPersistence.pushLegacyMirror store_mirror` msc=true engine=- provider=- snap=-
- 10334ms `useFinalPlaybackSnapshot.commitFrame snapshot_commit` msc=true engine=- provider=- snap=true
- 10334ms `GlobalPlayerEngine.resume ENTER` msc=- engine=false provider=false snap=-
- 10334ms `ProviderRouter.resume ENTER` msc=- engine=- provider=false snap=-
- 10334ms `SpotifyProvider.resume ENTER` msc=- engine=- provider=false snap=-
- 10334ms `MediaSessionController.applyReconciledTransport reconcile` msc=true engine=false provider=- snap=-
