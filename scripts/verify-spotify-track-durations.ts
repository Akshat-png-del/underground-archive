#!/usr/bin/env npx tsx
/**
 * Fetch real Spotify track durations via Web API and emit verified duration registry.
 * Catalog / metadata only — does not touch playback.
 *
 * Usage: npx tsx scripts/verify-spotify-track-durations.ts
 */
import { config } from "dotenv";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.local") });
config();

import { applyVerificationPipeline } from "../src/lib/archive/pipeline";
import { applyIngestedMetadata } from "../src/lib/ingestion/apply";
import { applyCatalogExpansion } from "../src/lib/catalog/apply-expansion";
import { applyAuthenticityCleanup } from "../src/lib/catalog/apply-authenticity";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";
import { getSpotifyCredentials } from "../src/lib/ingestion/config";
import { isValidSpotifyTrackId } from "../src/lib/archive/pipeline/validate";

const OUT_PATH = "src/lib/catalog/spotify-verified-durations.ts";

interface SpotifyTrackResponse {
  id: string;
  duration_ms: number;
  name?: string;
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function extractTrackId(spotifyUrl?: string): string | null {
  const m = spotifyUrl?.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]{22})/);
  return m?.[1] && isValidSpotifyTrackId(m[1]) ? m[1] : null;
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const body = new URLSearchParams({ grant_type: "client_credentials" });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  if (!res.ok) throw new Error(`Spotify auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Batch /tracks?ids= returns 403 for this app — use single-track GET. */
async function fetchOneTrackDuration(
  id: string,
  token: string,
): Promise<{ ms: number; display: string } | null> {
  const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} for ${id}: ${text.slice(0, 120)}`);
  }
  const data = (await res.json()) as SpotifyTrackResponse;
  if (!data?.duration_ms || data.duration_ms <= 0) return null;
  const display = formatDurationMs(data.duration_ms);
  if (!display) return null;
  return { ms: data.duration_ms, display };
}

async function main() {
  const creds = getSpotifyCredentials();
  if (!creds) {
    console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local");
    process.exit(1);
  }

  const rawArtists = applyAuthenticityCleanup(
    [
      ...coreArtists,
      ...catalogArtists,
      ...bulkCatalogArtists,
      ...expansionCatalogArtists,
    ]
      .map(applyIngestedMetadata)
      .map(applyCatalogExpansion)
      .map(applyVerificationPipeline),
  );

  const ids = [
    ...new Set(
      rawArtists.flatMap((a) =>
        a.topTracks.map((t) => extractTrackId(t.spotifyUrl)).filter((id): id is string => !!id),
      ),
    ),
  ].sort();

  console.log(`Fetching durations for ${ids.length} Spotify track IDs (single-track API)…`);

  const token = await getAccessToken(creds.clientId, creds.clientSecret);
  const verified: Record<string, { ms: number; display: string }> = {};
  const invalid: string[] = [];
  const unresolved: string[] = [];

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    if (!isValidSpotifyTrackId(id)) {
      invalid.push(id);
      continue;
    }
    try {
      const hit = await fetchOneTrackDuration(id, token);
      if (!hit) unresolved.push(id);
      else verified[id] = hit;
    } catch (err) {
      console.warn(`retry ${id}:`, err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 500));
      try {
        const hit = await fetchOneTrackDuration(id, token);
        if (!hit) unresolved.push(id);
        else verified[id] = hit;
      } catch {
        unresolved.push(id);
      }
    }
    if ((i + 1) % 25 === 0) {
      console.log(`  …${i + 1}/${ids.length}`);
    }
    await new Promise((r) => setTimeout(r, 50));
  }

  const sortedIds = Object.keys(verified).sort();
  const lines = [
    `/**`,
    ` * Verified Spotify track durations — fetched via Spotify Web API (duration_ms).`,
    ` * Do not edit manually. Regenerate: npx tsx scripts/verify-spotify-track-durations.ts`,
    ` * Generated: ${new Date().toISOString()}`,
    ` */`,
    ``,
    `export type SpotifyVerifiedDuration = { ms: number; display: string };`,
    ``,
    `export const SPOTIFY_VERIFIED_DURATIONS: Readonly<Record<string, SpotifyVerifiedDuration>> = {`,
    ...sortedIds.map(
      (id) =>
        `  ${JSON.stringify(id)}: { ms: ${verified[id]!.ms}, display: ${JSON.stringify(verified[id]!.display)} },`,
    ),
    `};`,
    ``,
    `export function getSpotifyVerifiedDurationDisplay(trackId: string): string | undefined {`,
    `  return SPOTIFY_VERIFIED_DURATIONS[trackId]?.display;`,
    `}`,
    ``,
  ];

  writeFileSync(OUT_PATH, lines.join("\n"));

  console.log(`Wrote ${sortedIds.length} verified durations → ${OUT_PATH}`);
  console.log(`Unresolved (API null/missing): ${unresolved.length}`);
  console.log(`Invalid IDs: ${invalid.length}`);
  if (unresolved.length) console.log("Unresolved sample:", unresolved.slice(0, 10));
  if (invalid.length) console.log("Invalid:", invalid);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
