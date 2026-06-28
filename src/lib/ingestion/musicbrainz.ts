import { fetchJson, sleep } from "./http";
import type { MusicBrainzIngested } from "./types";

interface MbArtistSearch {
  artists?: {
    id: string;
    name: string;
    country?: string;
    disambiguation?: string;
    score: number;
  }[];
}

interface CoverArtArchiveResponse {
  images?: { front?: boolean; image?: string; thumbnails?: { large?: string } }[];
}

export function isMusicBrainzConfigured(): boolean {
  return true;
}

export async function fetchMusicBrainzArtist(name: string): Promise<MusicBrainzIngested | null> {
  const q = encodeURIComponent(`artist:"${name}"`);
  await sleep(1100);

  const search = await fetchJson<MbArtistSearch>(
    `https://musicbrainz.org/ws/2/artist?query=${q}&fmt=json&limit=5`,
    { provider: "musicbrainz" }
  );

  const artist = search.artists?.sort((a, b) => b.score - a.score)[0];
  if (!artist) return null;

  let imageUrl: string | null = null;
  try {
    await sleep(1100);
    imageUrl = await fetchMusicBrainzCoverArt(artist.id);
  } catch {
    // Cover art is optional
  }

  return {
    mbid: artist.id,
    name: artist.name,
    country: artist.country ?? null,
    disambiguation: artist.disambiguation ?? null,
    imageUrl,
  };
}

async function fetchMusicBrainzCoverArt(mbid: string): Promise<string | null> {
  await sleep(1100);
  const releases = await fetchJson<{ releases?: { id: string }[] }>(
    `https://musicbrainz.org/ws/2/release?artist=${mbid}&fmt=json&limit=1`,
    { provider: "musicbrainz" }
  );
  const releaseId = releases.releases?.[0]?.id;
  if (!releaseId) return null;

  await sleep(1100);
  const art = await fetchJson<CoverArtArchiveResponse>(
    `https://coverartarchive.org/release/${releaseId}`,
    { provider: "musicbrainz" }
  );
  const front = art.images?.find((i) => i.front) ?? art.images?.[0];
  return front?.thumbnails?.large ?? front?.image ?? null;
}
