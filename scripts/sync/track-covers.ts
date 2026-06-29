#!/usr/bin/env npx tsx
/**
 * Resolve Spotify track/album cover hashes via oEmbed and merge into track-cover-hashes.json.
 * Usage: npx tsx scripts/sync/track-covers.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../../src/content/artists/all";
import { spotifyCoverHash, scdn } from "../../src/content/artists/track-covers";

const HASH_FILE = join(process.cwd(), "src/content/artists/track-cover-hashes.json");

function loadHashes(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(HASH_FILE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

function collectSpotifyIds(): Set<string> {
  const ids = new Set<string>();
  for (const artist of artists) {
    for (const track of artist.topTracks) {
      const m = track.spotifyUrl?.match(/\/(track|album)\/([a-zA-Z0-9]{22})/);
      if (m) ids.add(m[2]);
    }
    for (const release of [...artist.albums, ...artist.eps, ...artist.singles]) {
      const m = release.spotifyUrl?.match(/\/(track|album)\/([a-zA-Z0-9]{22})/);
      if (m) ids.add(m[2]);
      const fromCover = release.coverArt?.match(/i\.scdn\.co\/image\/([a-z0-9]+)/i);
      if (fromCover) {
        // reverse-lookup not possible; skip
      }
    }
  }
  return ids;
}

function needsHash(id: string, merged: Record<string, string>): boolean {
  return !merged[id] && !spotifyCoverHash(id);
}

async function fetchHash(id: string): Promise<string | null> {
  const forTrack = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/track/${id}`)}`;
  let res = await fetch(forTrack, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const forAlbum = `https://open.spotify.com/oembed?url=${encodeURIComponent(`https://open.spotify.com/album/${id}`)}`;
    res = await fetch(forAlbum, { headers: { Accept: "application/json" } });
  }
  if (!res.ok) return null;
  const data = (await res.json()) as { thumbnail_url?: string };
  const thumb = data.thumbnail_url;
  if (!thumb) return null;
  const hash = thumb.split("/").pop();
  return hash?.startsWith("ab67616d") ? hash : null;
}

async function main() {
  const existing = loadHashes();
  const ids = [...collectSpotifyIds()].filter((id) => needsHash(id, existing));
  console.log(`Fetching ${ids.length} missing Spotify cover hashes…`);

  const merged = { ...existing };
  let added = 0;
  let failed = 0;

  for (const id of ids) {
    const hash = await fetchHash(id);
    if (hash) {
      merged[id] = hash;
      added++;
      process.stdout.write(".");
    } else {
      failed++;
      console.warn(`\n✗ ${id}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const sorted = Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(HASH_FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");

  console.log(`\nDone: ${added} added, ${failed} failed, ${Object.keys(sorted).length} total hashes`);
  console.log(`Written to ${HASH_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
