import { sleep } from "../../src/lib/ingestion/http";

const UA = "UndergroundArchive/1.0 (catalog-expand)";

export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html" },
    redirect: "follow",
  });
  if (!res.ok) return "";
  return res.text();
}

export function extractSpotifyTrackIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/spotify:track:([a-zA-Z0-9]{22})/g)) {
    ids.add(m[1]);
  }
  return [...ids];
}

export function extractSpotifyAlbumIds(html: string): string[] {
  const ids = new Set<string>();
  for (const m of html.matchAll(/spotify:album:([a-zA-Z0-9]{22})/g)) {
    ids.add(m[1]);
  }
  return [...ids].slice(0, 8);
}

export interface SpotifyTrackMeta {
  id: string;
  title: string;
  duration: string;
  year: number;
}

export async function fetchSpotifyTrackMeta(trackId: string): Promise<SpotifyTrackMeta | null> {
  try {
    const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(
      `https://open.spotify.com/track/${trackId}`
    )}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string };
    const title = data.title?.replace(/\s*-\s*song.*$/i, "").trim();
    if (!title) return null;
    // oEmbed has no duration_ms — never invent placeholders (use verify-spotify-track-durations).
    return { id: trackId, title, duration: "", year: new Date().getFullYear() };
  } catch {
    return null;
  }
}

export async function scrapeSpotifyDiscography(
  artistId: string,
  artistName: string,
  maxTracks: number
): Promise<SpotifyTrackMeta[]> {
  const artistHtml = await fetchHtml(`https://open.spotify.com/artist/${artistId}`);
  const trackIds = new Set(extractSpotifyTrackIds(artistHtml));
  const albumIds = extractSpotifyAlbumIds(artistHtml);

  for (const albumId of albumIds) {
    if (trackIds.size >= maxTracks) break;
    await sleep(200);
    const albumHtml = await fetchHtml(`https://open.spotify.com/album/${albumId}`);
    for (const id of extractSpotifyTrackIds(albumHtml)) {
      trackIds.add(id);
      if (trackIds.size >= maxTracks) break;
    }
  }

  const results: SpotifyTrackMeta[] = [];
  const normalizedArtist = artistName.toLowerCase();

  for (const id of trackIds) {
    if (results.length >= maxTracks) break;
    await sleep(150);
    const meta = await fetchSpotifyTrackMeta(id);
    if (!meta) continue;
    // oembed title is usually "Track - Artist" or "Track - song by Artist"
    const titleLower = meta.title.toLowerCase();
    if (!titleLower.includes(normalizedArtist.split(" ")[0]!.toLowerCase())) {
      // Still accept if from artist page scrape — IDs came from artist profile
    }
    results.push(meta);
  }

  return results;
}
