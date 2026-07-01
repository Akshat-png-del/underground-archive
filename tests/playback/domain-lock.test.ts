import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PlaybackItem } from "@/lib/music/playback";
import {
  isAudioDomainItem,
  isAudioProviderKind,
  isVideoProviderKind,
  resolveActiveMediaDomain,
} from "@/lib/music/playback-domain-lock";

const track: PlaybackItem = {
  type: "track",
  refId: "artist::song",
  label: "Song",
  title: "Song",
  subtitle: "Artist",
  spotifyUrl: "https://open.spotify.com/track/abc",
};

const set: PlaybackItem = {
  type: "set",
  refId: "slug::set",
  label: "Set",
  title: "Set",
  subtitle: "Venue",
  youtubeId: "abc123",
  youtubeUrl: "https://www.youtube.com/watch?v=abc123",
};

describe("playback domain lock", () => {
  it("classifies tracks as audio domain", () => {
    assert.equal(resolveActiveMediaDomain(track), "audio");
    assert.equal(isAudioDomainItem(track), true);
  });

  it("classifies youtube sets as video domain", () => {
    assert.equal(resolveActiveMediaDomain(set), "video");
    assert.equal(isAudioDomainItem(set), false);
  });

  it("maps provider kinds to domains", () => {
    assert.equal(isAudioProviderKind("spotify"), true);
    assert.equal(isAudioProviderKind("audio"), true);
    assert.equal(isAudioProviderKind("youtube"), false);
    assert.equal(isVideoProviderKind("youtube"), true);
    assert.equal(isVideoProviderKind("spotify"), false);
  });

  it("idle session has no active domain", () => {
    assert.equal(resolveActiveMediaDomain(null), "idle");
  });
});
