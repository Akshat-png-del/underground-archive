#!/usr/bin/env npx tsx
/**
 * Fetch real YouTube durations via Data API and emit verified duration registry.
 * Content/ingestion only — does not touch playback.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { applyVerificationPipeline } from "../src/lib/archive/pipeline";
import { applyIngestedMetadata } from "../src/lib/ingestion/apply";
import { applyCatalogExpansion } from "../src/lib/catalog/apply-expansion";
import { coreArtists } from "../src/content/artists/data";
import { catalogArtists } from "../src/content/artists/catalog";
import { bulkCatalogArtists } from "../src/content/artists/catalog-bulk";
import { expansionCatalogArtists } from "../src/content/artists/catalog-expansion";
import { targetArtistCatalogArtists } from "../src/content/artists/target-artists-seeds";
import { getYoutubeApiKey } from "../src/lib/ingestion/config";
import { fetchJson } from "../src/lib/ingestion/http";
import { hasValidYoutubeId } from "../src/lib/catalog/apply-authenticity";

const MIN_SET_SECONDS = 10 * 60;
const OUT_PATH = "src/lib/catalog/youtube-verified-durations.ts";

interface YoutubeVideosResponse {
  items?: {
    id: string;
    status?: { privacyStatus?: string; uploadStatus?: string };
    contentDetails?: { duration?: string };
  }[];
}

function parseIso8601Duration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + s;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function fetchVideoDetails(ids: string[], key: string): Promise<YoutubeVideosResponse["items"]> {
  const joined = ids.join(",");
  const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${joined}&key=${key}`;
  const data = await fetchJson<YoutubeVideosResponse>(url, { provider: "youtube" });
  return data.items ?? [];
}

async function main() {
  const key = getYoutubeApiKey();
  if (!key) {
    console.error("Set YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }

  const rawArtists = [
    ...coreArtists,
    ...catalogArtists,
    ...bulkCatalogArtists,
    ...expansionCatalogArtists,
    ...targetArtistCatalogArtists,
  ]
    .map(applyIngestedMetadata)
    .map(applyCatalogExpansion)
    .map(applyVerificationPipeline);

  const ids = [
    ...new Set(
      rawArtists.flatMap((a) => a.essentialSets.map((s) => s.youtubeId?.trim()).filter(hasValidYoutubeId)),
    ),
  ].sort();

  console.log(`Fetching durations for ${ids.length} YouTube IDs…`);

  const verified: Record<string, { seconds: number; display: string }> = {};
  const unplayable: string[] = [];
  const tooShort: string[] = [];

  for (const batch of chunk(ids, 50)) {
    const items = await fetchVideoDetails(batch, key);
    const found = new Set(items?.map((i) => i.id) ?? []);

    for (const id of batch) {
      if (!found.has(id)) {
        unplayable.push(id);
        continue;
      }
    }

    for (const item of items ?? []) {
      const id = item.id;
      const privacy = item.status?.privacyStatus;
      const upload = item.status?.uploadStatus;
      if (privacy === "private" || upload === "rejected" || upload === "deleted") {
        unplayable.push(id);
        continue;
      }
      const iso = item.contentDetails?.duration;
      if (!iso) {
        unplayable.push(id);
        continue;
      }
      const seconds = parseIso8601Duration(iso);
      if (seconds < MIN_SET_SECONDS) {
        tooShort.push(id);
        continue;
      }
      verified[id] = { seconds, display: formatDuration(seconds) };
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  const lines = [
    "/**",
    " * Verified YouTube set durations — fetched via YouTube Data API.",
    " * Do not edit manually. Regenerate: npx tsx scripts/verify-youtube-set-durations.ts",
    " */",
    "export interface VerifiedYoutubeDuration {",
    "  seconds: number;",
    "  display: string;",
    "}",
    "",
    `export const MIN_VERIFIED_SET_SECONDS = ${MIN_SET_SECONDS};`,
    "",
    "export const YOUTUBE_VERIFIED_DURATIONS: Readonly<Record<string, VerifiedYoutubeDuration>> = {",
    ...Object.entries(verified)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, v]) => `  "${id}": { seconds: ${v.seconds}, display: "${v.display}" },`),
    "};",
    "",
    "export const YOUTUBE_UNPLAYABLE_IDS: ReadonlySet<string> = new Set([",
    ...unplayable.sort().map((id) => `  "${id}",`),
    "]);",
    "",
    "export const YOUTUBE_TOO_SHORT_IDS: ReadonlySet<string> = new Set([",
    ...tooShort.sort().map((id) => `  "${id}",`),
    "]);",
    "",
  ];

  writeFileSync(OUT_PATH, lines.join("\n"));

  console.log(`Verified (≥10 min): ${Object.keys(verified).length}`);
  console.log(`Unplayable/missing: ${unplayable.length}`);
  console.log(`Too short (<10 min): ${tooShort.length}`);
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
