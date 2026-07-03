# Spotify Auto-Next Runtime Audit

Generated: 2026-07-03T06:14:18.301Z

## Answers

- **q1_spotifyPlaybackUpdateAtEnd**: true
- **q1_playbackUpdateCountAfterSeek**: 24
- **q1_pausedAtEndSignals**: 0
- **q2_onEndedInferred**: true
- **q2_onEndedCount**: 1
- **q3_advanceQueueOnEndCount**: 0
- **q4_playNextCountAfterSeek**: 1
- **q5_queueIndexPlusOne**: true
- **q6_nextTrackAutoStart**: false
- **q7_duplicatePlay**: false
- **q8_skippedTracks**: false
- **q9_previewAutoNext**: false
- **q10_prevWorksAfterAutoNext**: true

## Spotify transition

- Start: `sara-landry::legacy` @ index 0
- After seek near end: time 0
- Final: `sara-landry::pressure` @ index 1, playing=undefined, time=0
- advanceQueueOnEnd calls after seek: 0
- play() calls after seek: 1

## Console chain after Spotify seek

- t+6916ms **engine-onEnded**
- t+6917ms **advanceQueueOnEnd-enter**
- t+6917ms **preview-ended-log**
- t+6918ms **engine-play-requested**
- t+6919ms **provider-play-enter**
- t+7463ms **spotify-playback-update**
- t+7463ms **spotify-playback-update**
- t+7463ms **spotify-playback-update**
- t+7497ms **spotify-playback-update**
- t+7497ms **spotify-playback-update**
- t+7501ms **spotify-playback-update**
- t+8159ms **spotify-playback-update**
- t+8159ms **spotify-playback-update**
- t+8160ms **spotify-playback-update**
- t+8471ms **engine-play-requested**
- t+8471ms **provider-play-enter**
- t+8987ms **spotify-playback-update**
- t+8987ms **spotify-playback-update**
- t+8987ms **spotify-playback-update**
- t+9030ms **spotify-playback-update**
- t+9030ms **spotify-playback-update**
- t+9030ms **spotify-playback-update**
- t+9676ms **spotify-playback-update**
- t+9676ms **spotify-playback-update**
- t+9677ms **spotify-playback-update**
- t+10071ms **spotify-playback-update**
- t+10071ms **spotify-playback-update**
- t+10071ms **spotify-playback-update**
- t+11133ms **spotify-playback-update**
- t+11133ms **spotify-playback-update**
- t+11133ms **spotify-playback-update**