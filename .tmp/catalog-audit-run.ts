import { writeFileSync } from "node:fs";
import { artists } from "../src/content/artists/all";
import { catalogTracks, catalogReleases } from "../src/content/tracks";
import { archiveSets } from "../src/content/sets";
import { parseDuration } from "../src/lib/music";
import { canDisplaySet } from "../src/lib/archive/verification";
import { analyzePlaybackItem, playbackSourceLabel } from "../src/lib/music/playback-source";
import { playbackItemFromTrack, playbackItemFromSet } from "../src/lib/music/playback";

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const SPOTIFY_TRACK_RE = /open\.spotify\.com\/track\/[a-zA-Z0-9]{22}/;
const SPOTIFY_ARTIST_RE = /open\.spotify\.com\/artist\/[a-zA-Z0-9]{22}/;
const SPOTIFY_ALBUM_RE = /open\.spotify\.com\/album\/[a-zA-Z0-9]{22}/;
const blank = (s?: string | null) => !s || !String(s).trim();
const ytOk = (id?: string) => !!id && YT_ID_RE.test(id.trim());

function classifySpotify(u?: string) {
  if (blank(u)) return "blank";
  if (SPOTIFY_TRACK_RE.test(u!)) return "track";
  if (SPOTIFY_ALBUM_RE.test(u!)) return "album";
  if (SPOTIFY_ARTIST_RE.test(u!)) return "artist";
  return "invalid";
}

const byTier: Record<string, number> = {};
const byVer: Record<string, number> = {};
let noSpotifyId = 0, noSpotifyLink = 0, noExt = 0, noTracks = 0, noSets = 0, unvPortrait = 0;
for (const a of artists) {
  byTier[a.curationTier] = (byTier[a.curationTier] ?? 0) + 1;
  byVer[a.verificationStatus] = (byVer[a.verificationStatus] ?? 0) + 1;
  if (blank(a.spotifyArtistId)) noSpotifyId++;
  if (!SPOTIFY_ARTIST_RE.test(a.externalLinks?.spotify ?? "") && blank(a.spotifyArtistId)) noSpotifyLink++;
  if (!a.externalLinks || Object.values(a.externalLinks).every((v) => blank(v as string))) noExt++;
  if (!a.topTracks?.length) noTracks++;
  if (!a.essentialSets?.length) noSets++;
  if (!a.image?.verified) unvPortrait++;
}

const nested = artists.flatMap((a) => a.topTracks);
const nestSpotify = { blank: 0, track: 0, album: 0, artist: 0, invalid: 0 };
for (const t of nested) nestSpotify[classifySpotify(t.spotifyUrl) as keyof typeof nestSpotify]++;

const nest = {
  total: nested.length,
  verified: nested.filter((t) => t.verified).length,
  spotifyUrlKind: nestSpotify,
  blankYt: nested.filter((t) => blank(t.youtubeUrl)).length,
  noUrl: nested.filter((t) => blank(t.spotifyUrl) && blank(t.youtubeUrl)).length,
  artistOrAlbumAsTrackUrl: nested.filter((t) => ["album", "artist"].includes(classifySpotify(t.spotifyUrl))).length,
};

const catSpotify = { blank: 0, track: 0, album: 0, artist: 0, invalid: 0 };
for (const t of catalogTracks) catSpotify[classifySpotify(t.spotifyUrl) as keyof typeof catSpotify]++;

const tp = catalogTracks.map((t) => ({ t, a: analyzePlaybackItem(playbackItemFromTrack(t)) }));
const ctIssues: Record<string, number> = {};
const ctSource: Record<string, number> = {};
for (const x of tp) {
  ctSource[playbackSourceLabel(x.a.kind)] = (ctSource[playbackSourceLabel(x.a.kind)] ?? 0) + 1;
  if (x.a.issue) ctIssues[x.a.issue] = (ctIssues[x.a.issue] ?? 0) + 1;
}

const ct = {
  total: catalogTracks.length,
  verified: catalogTracks.filter((t) => t.verified).length,
  spotifyUrlKind: catSpotify,
  blankYt: catalogTracks.filter((t) => blank(t.youtubeUrl)).length,
  hasPreview: catalogTracks.filter((t) => !blank(t.previewUrl)).length,
  noMedia: catalogTracks.filter((t) => blank(t.spotifyUrl) && blank(t.youtubeUrl) && blank(t.previewUrl) && blank(t.soundcloudUrl)).length,
  playable: tp.filter((x) => x.a.playable).length,
  unplayable: tp.filter((x) => !x.a.playable).length,
  bySource: ctSource,
  issues: ctIssues,
  artistOrAlbumAsTrackUrl: catalogTracks.filter((t) => ["album", "artist"].includes(classifySpotify(t.spotifyUrl))).length,
};

const allEss = artists.flatMap((a) =>
  a.essentialSets.map((s) => ({ ...s, artistName: a.name, artistSlug: a.slug, artistId: a.id })),
);
const filtered = allEss.filter((s) => !canDisplaySet(s, s.artistId, s.artistSlug));
const sp = archiveSets.map((s) => ({
  s,
  a: analyzePlaybackItem(playbackItemFromSet(s)),
  secs: parseDuration(s.duration),
}));
const setIssues: Record<string, number> = {};
const setSource: Record<string, number> = {};
for (const x of sp) {
  setSource[playbackSourceLabel(x.a.kind)] = (setSource[playbackSourceLabel(x.a.kind)] ?? 0) + 1;
  if (x.a.issue) setIssues[x.a.issue] = (setIssues[x.a.issue] ?? 0) + 1;
}

const sets = {
  essentialTotal: allEss.length,
  archiveDisplayed: archiveSets.length,
  filteredOut: filtered.length,
  verified: allEss.filter((s) => s.verified).length,
  unverified: allEss.filter((s) => !s.verified).length,
  blankYt: allEss.filter((s) => blank(s.youtubeId)).length,
  invalidYt: allEss.filter((s) => !blank(s.youtubeId) && !ytOk(s.youtubeId)).length,
  playable: sp.filter((x) => x.a.playable).length,
  unplayable: sp.filter((x) => !x.a.playable).length,
  durationHardcoded1h: archiveSets.filter((s) => s.duration === "1:00:00").length,
  under10min: sp.filter((x) => x.secs > 0 && x.secs < 600).length,
  bySource: setSource,
  issues: setIssues,
};

const unplayTracks = tp.filter((x) => !x.a.playable).slice(0, 20).map((x) => ({
  id: x.t.id, title: x.t.title, artist: x.t.artist, issue: x.a.issue,
  spotifyKind: classifySpotify(x.t.spotifyUrl), spotify: x.t.spotifyUrl || "",
}));

const badUrlTracks = tp
  .filter((x) => ["album", "artist", "invalid", "blank"].includes(classifySpotify(x.t.spotifyUrl)) && blank(x.t.youtubeUrl) && blank(x.t.previewUrl))
  .slice(0, 40)
  .map((x) => ({
    id: x.t.id, title: x.t.title, artist: x.t.artist,
    spotifyKind: classifySpotify(x.t.spotifyUrl), playable: x.a.playable, issue: x.a.issue,
  }));

const badEss = allEss.filter((s) => blank(s.youtubeId) || !ytOk(s.youtubeId)).slice(0, 30).map((s) => ({
  artist: s.artistName, title: s.title, yt: s.youtubeId || "(blank)", verified: s.verified,
}));

const unplaySets = sp.filter((x) => !x.a.playable).slice(0, 20).map((x) => ({
  id: x.s.id, title: x.s.title, artist: x.s.artistName, yt: x.s.youtubeId, issue: x.a.issue,
}));

const under10 = sp.filter((x) => x.secs > 0 && x.secs < 600).map((x) => ({
  title: x.s.title, artist: x.s.artistName, duration: x.s.duration, yt: x.s.youtubeId,
}));

const out = {
  artists: { total: artists.length, byTier, byVerification: byVer, noSpotifyArtistId: noSpotifyId, noSpotifyLink, noExternalLinks: noExt, noTopTracks: noTracks, noEssentialSets: noSets, unverifiedPortrait: unvPortrait },
  nestedTopTracks: nest,
  catalogTracks: ct,
  releases: { total: catalogReleases.length, blankSpotify: catalogReleases.filter((r) => blank(r.spotifyUrl)).length },
  sets,
  samples: { unplayableTracks: unplayTracks, weakSpotifyTrackUrls: badUrlTracks, badYoutubeEssentials: badEss, unplayableSets: unplaySets, under10minSets: under10 },
};

writeFileSync(new URL("./catalog-audit-result.json", import.meta.url), JSON.stringify(out, null, 2));
console.error("WROTE .tmp/catalog-audit-result.json");
