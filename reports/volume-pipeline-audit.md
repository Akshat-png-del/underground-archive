# Volume Pipeline Runtime Audit

Generated: 2026-07-03T05:40:55.212Z

## Samples

### after-spotify-play (t+6955ms)

```json
{
  "label": "after-spotify-play",
  "ts": 1783057245169,
  "msc": {
    "volume": 1,
    "muted": false
  },
  "engine": {
    "mode": "spotify",
    "refId": "sara-landry::legacy"
  },
  "store": {
    "volume": 1,
    "muted": false
  },
  "snapshot": {
    "volume": 1,
    "muted": false
  },
  "ui": {
    "sliderValue": null,
    "sliderPresent": false
  },
  "dom": {
    "volume": null,
    "muted": null,
    "present": false
  },
  "routerKind": "spotify"
}
```
### after-msc-setVolume-0.35-on-spotify (t+7402ms)

```json
{
  "label": "after-msc-setVolume-spotify",
  "ts": 1783057245605,
  "msc": {
    "volume": 0.35,
    "muted": false
  },
  "engine": {
    "mode": "spotify",
    "refId": "sara-landry::legacy"
  },
  "store": {
    "volume": 0.35,
    "muted": false
  },
  "snapshot": {
    "volume": 0.35,
    "muted": false
  },
  "ui": {
    "sliderValue": null,
    "sliderPresent": false
  },
  "dom": {
    "volume": null,
    "muted": null,
    "present": false
  },
  "routerKind": "spotify"
}
```
### after-msc-toggleMute-on-spotify (t+7811ms)

```json
{
  "label": "after-msc-toggleMute-spotify",
  "ts": 1783057246014,
  "msc": {
    "volume": 0.35,
    "muted": false
  },
  "engine": {
    "mode": "spotify",
    "refId": "sara-landry::legacy"
  },
  "store": {
    "volume": 0.35,
    "muted": false
  },
  "snapshot": {
    "volume": 0.35,
    "muted": false
  },
  "ui": {
    "sliderValue": null,
    "sliderPresent": false
  },
  "dom": {
    "volume": null,
    "muted": null,
    "present": false
  },
  "routerKind": "spotify"
}
```
### after-preview-play-volume-0.42 (t+13852ms)

```json
{
  "label": "after-preview-play",
  "ts": 1783057252055,
  "msc": {
    "volume": 0.42,
    "muted": false
  },
  "engine": {
    "mode": "audio",
    "refId": "volume-audit::preview-test"
  },
  "store": {
    "volume": 0.42,
    "muted": false
  },
  "snapshot": {
    "volume": 0.42,
    "muted": false
  },
  "ui": {
    "sliderValue": 0.42,
    "sliderPresent": true
  },
  "dom": {
    "volume": 0.42,
    "muted": false,
    "present": true
  },
  "routerKind": "audio"
}
```
### after-preview-setVolume-0.15 (t+14370ms)

```json
{
  "label": "after-preview-setVolume",
  "ts": 1783057252573,
  "msc": {
    "volume": 0.15,
    "muted": false
  },
  "engine": {
    "mode": "audio",
    "refId": "volume-audit::preview-test"
  },
  "store": {
    "volume": 0.15,
    "muted": false
  },
  "snapshot": {
    "volume": 0.15,
    "muted": false
  },
  "ui": {
    "sliderValue": 0.15,
    "sliderPresent": true
  },
  "dom": {
    "volume": 0.15,
    "muted": false,
    "present": true
  },
  "routerKind": "audio"
}
```
### after-ui-slider-0.65 (t+14893ms)

```json
{
  "label": "after-ui-slider",
  "ts": 1783057253095,
  "msc": {
    "volume": 0.65,
    "muted": false
  },
  "engine": {
    "mode": "audio",
    "refId": "volume-audit::preview-test"
  },
  "store": {
    "volume": 0.65,
    "muted": false
  },
  "snapshot": {
    "volume": 0.65,
    "muted": false
  },
  "ui": {
    "sliderValue": 0.65,
    "sliderPresent": true
  },
  "dom": {
    "volume": 0.65,
    "muted": false,
    "present": true
  },
  "routerKind": "audio"
}
```
### after-preview-toggleMute (t+15311ms)

```json
{
  "label": "after-preview-toggleMute",
  "ts": 1783057253515,
  "msc": {
    "volume": 0.65,
    "muted": true
  },
  "engine": {
    "mode": "audio",
    "refId": "volume-audit::preview-test"
  },
  "store": {
    "volume": 0.65,
    "muted": true
  },
  "snapshot": {
    "volume": 0.65,
    "muted": true
  },
  "ui": {
    "sliderValue": 0,
    "sliderPresent": true
  },
  "dom": {
    "volume": 0.65,
    "muted": true,
    "present": true
  },
  "routerKind": "audio"
}
```
### after-navigate-discover (t+16973ms)

```json
{
  "label": "after-navigate",
  "ts": 1783057255177,
  "msc": {
    "volume": 1,
    "muted": false
  },
  "engine": {
    "mode": "audio",
    "refId": "volume-audit::preview-test"
  },
  "store": {
    "volume": 1,
    "muted": false
  },
  "snapshot": {
    "volume": 1,
    "muted": false
  },
  "ui": {
    "sliderValue": 1,
    "sliderPresent": true
  },
  "dom": {
    "volume": 1,
    "muted": false,
    "present": true
  },
  "routerKind": "audio"
}
```

## Key trace events

- t+1943ms `MediaSessionController.applyVolumeToEngine` enter {"id":1,"ts":1822.5,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"enter","previousVolume":1,"previousMuted":false,"providerKind":"spotify","activeRouterKind":"spotify","note":"early_return_non_preview","domAudioVolume":null,"domAu
- t+6997ms `MediaSessionController.setVolume` enter {"id":9,"ts":6963.299999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"enter","previousVolume":1,"newVolume":0.35,"previousMuted":false,"newMuted":false,"muteChanged":false,"providerKind":"spotify","note":"msc_only_non_preview","domAu
- t+6997ms `MediaSessionController.setVolume` exit {"id":10,"ts":6964,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"exit","newVolume":0.35,"newMuted":false,"mscOverwrote":true,"storeVolume":0.35,"storeMuted":false,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+7410ms `MediaSessionController.toggleMute` enter {"id":12,"ts":7400.89999999851,"initiator":"MediaSessionController","fn":"MediaSessionController.toggleMute","phase":"enter","previousVolume":0.35,"previousMuted":false,"providerKind":"spotify","note":"early_return_non_preview","domAudioVolume":null,"domAudioMuted":null,"domAudio
- t+7856ms `MediaSessionController.setVolume` enter {"id":14,"ts":7807.299999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"enter","previousVolume":0.35,"newVolume":0.42,"previousMuted":false,"newMuted":false,"muteChanged":false,"providerKind":"spotify","note":"msc_only_non_preview","d
- t+7857ms `MediaSessionController.setVolume` exit {"id":15,"ts":7807.799999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"exit","newVolume":0.42,"newMuted":false,"mscOverwrote":true,"storeVolume":0.42,"storeMuted":false,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":fal
- t+7857ms `MediaSessionController.applyVolumeToEngine` enter {"id":16,"ts":7809.299999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"enter","previousVolume":0.42,"previousMuted":false,"providerKind":"preview","activeRouterKind":"audio","note":"forwarding_to_engine","domAudioVolume":nu
- t+7857ms `GlobalPlayerEngine.setVolume` invoke {"id":17,"ts":7809.5,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setVolume","phase":"invoke","newVolume":0.42,"activeRouterKind":"spotify","domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+7858ms `ProviderRouter.setVolume` skip_non_audio {"id":18,"ts":7809.5999999996275,"initiator":"ProviderRouter","fn":"ProviderRouter.setVolume","phase":"skip_non_audio","newVolume":0.42,"activeRouterKind":"spotify","providerAccepted":false,"note":"only AudioProvider receives setVolume","domAudioVolume":null,"domAudioMuted":null,
- t+7858ms `GlobalPlayerEngine.setMuted` invoke {"id":19,"ts":7809.699999999255,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":false,"activeRouterKind":"spotify","domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+7858ms `ProviderRouter.setMuted` skip_non_audio {"id":20,"ts":7809.799999998882,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"skip_non_audio","newMuted":false,"activeRouterKind":"spotify","providerAccepted":false,"note":"only AudioProvider receives setMuted","domAudioVolume":null,"domAudioMuted":null,"do
- t+7858ms `MediaSessionController.applyVolumeToEngine` exit {"id":21,"ts":7809.799999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"exit","newVolume":0.42,"newMuted":false,"providerAccepted":true,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+7858ms `AudioProvider.init` audio_element_created {"id":22,"ts":7829.39999999851,"initiator":"AudioProvider","fn":"AudioProvider.init","phase":"audio_element_created","newVolume":1,"newMuted":false,"providerAccepted":true,"note":"defaults_from_constructor","domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+7868ms `MediaSessionController.applyVolumeToEngine` enter {"id":23,"ts":7833.89999999851,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"enter","previousVolume":0.42,"previousMuted":false,"providerKind":"preview","activeRouterKind":"audio","note":"forwarding_to_engine","domAudioVolume":1,"
- t+7868ms `GlobalPlayerEngine.setVolume` invoke {"id":24,"ts":7834,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setVolume","phase":"invoke","newVolume":0.42,"activeRouterKind":"audio","domAudioVolume":1,"domAudioMuted":false,"domAudioPresent":true}
- t+7868ms `ProviderRouter.setVolume` forward_audio {"id":25,"ts":7834.199999999255,"initiator":"ProviderRouter","fn":"ProviderRouter.setVolume","phase":"forward_audio","newVolume":0.42,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":1,"domAudioMuted":false,"domAudioPresent":true}
- t+7869ms `AudioProvider.setVolume` applied {"id":26,"ts":7834.199999999255,"initiator":"AudioProvider","fn":"AudioProvider.setVolume","phase":"applied","previousVolume":1,"newVolume":0.42,"domAudioVolume":0.42,"providerAccepted":true,"domAudioMuted":false,"domAudioPresent":true}
- t+7869ms `GlobalPlayerEngine.setMuted` invoke {"id":27,"ts":7834.299999998882,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":false,"activeRouterKind":"audio","domAudioVolume":0.42,"domAudioMuted":false,"domAudioPresent":true}
- t+7869ms `ProviderRouter.setMuted` forward_audio {"id":28,"ts":7834.39999999851,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"forward_audio","newMuted":false,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.42,"domAudioMuted":false,"domAudioPresent":true}
- t+7869ms `AudioProvider.setMuted` applied {"id":29,"ts":7834.5,"initiator":"AudioProvider","fn":"AudioProvider.setMuted","phase":"applied","previousMuted":false,"newMuted":false,"domAudioMuted":false,"providerAccepted":true,"domAudioVolume":0.42,"domAudioPresent":true}
- t+7869ms `MediaSessionController.applyVolumeToEngine` exit {"id":30,"ts":7834.5,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"exit","newVolume":0.42,"newMuted":false,"providerAccepted":true,"domAudioVolume":0.42,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `MediaSessionController.setVolume` enter {"id":32,"ts":13848.299999998882,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"enter","previousVolume":0.42,"newVolume":0.15,"previousMuted":false,"newMuted":false,"muteChanged":false,"providerKind":"preview","note":"will_forward_engine","d
- t+13870ms `GlobalPlayerEngine.setVolume` invoke {"id":33,"ts":13848.5,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setVolume","phase":"invoke","newVolume":0.15,"activeRouterKind":"audio","domAudioVolume":0.42,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `ProviderRouter.setVolume` forward_audio {"id":34,"ts":13848.599999999627,"initiator":"ProviderRouter","fn":"ProviderRouter.setVolume","phase":"forward_audio","newVolume":0.15,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.42,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `AudioProvider.setVolume` applied {"id":35,"ts":13848.599999999627,"initiator":"AudioProvider","fn":"AudioProvider.setVolume","phase":"applied","previousVolume":0.42,"newVolume":0.15,"domAudioVolume":0.15,"providerAccepted":true,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `GlobalPlayerEngine.setMuted` invoke {"id":36,"ts":13848.699999999255,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":false,"activeRouterKind":"audio","domAudioVolume":0.15,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `ProviderRouter.setMuted` forward_audio {"id":37,"ts":13848.799999998882,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"forward_audio","newMuted":false,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.15,"domAudioMuted":false,"domAudioPresent":true}
- t+13870ms `AudioProvider.setMuted` applied {"id":38,"ts":13848.89999999851,"initiator":"AudioProvider","fn":"AudioProvider.setMuted","phase":"applied","previousMuted":false,"newMuted":false,"domAudioMuted":false,"providerAccepted":true,"domAudioVolume":0.15,"domAudioPresent":true}
- t+13870ms `MediaSessionController.setVolume` exit {"id":39,"ts":13849.5,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"exit","newVolume":0.15,"newMuted":false,"mscOverwrote":true,"storeVolume":0.15,"storeMuted":false,"domAudioVolume":0.15,"domAudioMuted":false,"domAudioPresent":true}
- t+14392ms `MediaSessionController.setVolume` enter {"id":42,"ts":14371.699999999255,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"enter","previousVolume":0.15,"newVolume":0.65,"previousMuted":false,"newMuted":false,"muteChanged":false,"providerKind":"preview","note":"will_forward_engine","d
- t+14392ms `GlobalPlayerEngine.setVolume` invoke {"id":43,"ts":14371.799999998882,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setVolume","phase":"invoke","newVolume":0.65,"activeRouterKind":"audio","domAudioVolume":0.15,"domAudioMuted":false,"domAudioPresent":true}
- t+14392ms `ProviderRouter.setVolume` forward_audio {"id":44,"ts":14371.89999999851,"initiator":"ProviderRouter","fn":"ProviderRouter.setVolume","phase":"forward_audio","newVolume":0.65,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.15,"domAudioMuted":false,"domAudioPresent":true}
- t+14392ms `AudioProvider.setVolume` applied {"id":45,"ts":14372,"initiator":"AudioProvider","fn":"AudioProvider.setVolume","phase":"applied","previousVolume":0.15,"newVolume":0.65,"domAudioVolume":0.65,"providerAccepted":true,"domAudioMuted":false,"domAudioPresent":true}
- t+14393ms `GlobalPlayerEngine.setMuted` invoke {"id":46,"ts":14372.099999999627,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":false,"activeRouterKind":"audio","domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14393ms `ProviderRouter.setMuted` forward_audio {"id":47,"ts":14372.199999999255,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"forward_audio","newMuted":false,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14393ms `AudioProvider.setMuted` applied {"id":48,"ts":14372.299999998882,"initiator":"AudioProvider","fn":"AudioProvider.setMuted","phase":"applied","previousMuted":false,"newMuted":false,"domAudioMuted":false,"providerAccepted":true,"domAudioVolume":0.65,"domAudioPresent":true}
- t+14393ms `MediaSessionController.setVolume` exit {"id":49,"ts":14373,"initiator":"MediaSessionController","fn":"MediaSessionController.setVolume","phase":"exit","newVolume":0.65,"newMuted":false,"mscOverwrote":true,"storeVolume":0.65,"storeMuted":false,"domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14913ms `MediaSessionController.toggleMute` enter {"id":51,"ts":14888.699999999255,"initiator":"MediaSessionController","fn":"MediaSessionController.toggleMute","phase":"enter","previousVolume":0.65,"previousMuted":false,"providerKind":"preview","domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14913ms `GlobalPlayerEngine.setMuted` invoke {"id":52,"ts":14888.89999999851,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":true,"activeRouterKind":"audio","domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14913ms `ProviderRouter.setMuted` forward_audio {"id":53,"ts":14889,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"forward_audio","newMuted":true,"activeRouterKind":"audio","providerAccepted":true,"domAudioVolume":0.65,"domAudioMuted":false,"domAudioPresent":true}
- t+14913ms `AudioProvider.setMuted` applied {"id":54,"ts":14889.099999999627,"initiator":"AudioProvider","fn":"AudioProvider.setMuted","phase":"applied","previousMuted":false,"newMuted":true,"domAudioMuted":true,"providerAccepted":true,"domAudioVolume":0.65,"domAudioPresent":true}
- t+14915ms `MediaSessionController.toggleMute` exit_muted {"id":55,"ts":14889.599999999627,"initiator":"MediaSessionController","fn":"MediaSessionController.toggleMute","phase":"exit_muted","previousMuted":false,"newMuted":true,"newVolume":0.65,"muteChanged":true,"mscOverwrote":true,"domAudioVolume":0.65,"domAudioMuted":true,"domAudioPr
- t+15738ms `MediaSessionController.applyVolumeToEngine` enter {"id":1,"ts":340.80000000074506,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"enter","previousVolume":1,"previousMuted":false,"providerKind":"preview","activeRouterKind":"audio","note":"forwarding_to_engine","domAudioVolume":null,
- t+15738ms `GlobalPlayerEngine.setVolume` invoke {"id":2,"ts":341,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setVolume","phase":"invoke","newVolume":1,"activeRouterKind":null,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+15738ms `ProviderRouter.setVolume` skip_non_audio {"id":3,"ts":341.40000000037253,"initiator":"ProviderRouter","fn":"ProviderRouter.setVolume","phase":"skip_non_audio","newVolume":1,"activeRouterKind":null,"providerAccepted":false,"note":"only AudioProvider receives setVolume","domAudioVolume":null,"domAudioMuted":null,"domAudio
- t+15738ms `GlobalPlayerEngine.setMuted` invoke {"id":4,"ts":341.7000000011176,"initiator":"GlobalPlayerEngine","fn":"GlobalPlayerEngine.setMuted","phase":"invoke","newMuted":false,"activeRouterKind":null,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+15738ms `ProviderRouter.setMuted` skip_non_audio {"id":5,"ts":342,"initiator":"ProviderRouter","fn":"ProviderRouter.setMuted","phase":"skip_non_audio","newMuted":false,"activeRouterKind":null,"providerAccepted":false,"note":"only AudioProvider receives setMuted","domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false
- t+15738ms `MediaSessionController.applyVolumeToEngine` exit {"id":6,"ts":342.30000000074506,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"exit","newVolume":1,"newMuted":false,"providerAccepted":true,"domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+15738ms `AudioProvider.init` audio_element_created {"id":7,"ts":345.30000000074506,"initiator":"AudioProvider","fn":"AudioProvider.init","phase":"audio_element_created","newVolume":1,"newMuted":false,"providerAccepted":true,"note":"defaults_from_constructor","domAudioVolume":null,"domAudioMuted":null,"domAudioPresent":false}
- t+15739ms `MediaSessionController.applyVolumeToEngine` enter {"id":8,"ts":346.90000000037253,"initiator":"MediaSessionController","fn":"MediaSessionController.applyVolumeToEngine","phase":"enter","previousVolume":1,"previousMuted":false,"providerKind":"preview","activeRouterKind":"audio","note":"forwarding_to_engine","domAudioVolume":1,"do