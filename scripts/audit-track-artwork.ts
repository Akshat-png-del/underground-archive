#!/usr/bin/env npx tsx
/**
 * Audit track/release artwork across the catalog.
 * Usage: npx tsx scripts/audit-track-artwork.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { artists } from "../src/content/artists/all";
import { catalogTracks, catalogReleases } from "../src/content/tracks";
import { isGenericArtworkFallback } from "../src/lib/music/track-artwork";
import { spotifyCoverHash } from "../src/content/artists/track-covers";

interface Issue {
  artist: string;
  title: string;
  kind: "track" | "release";
  coverArt: string;
  reason: string;
}

const issues: Issue[] = [];

for (const artist of artists) {
  for (const track of artist.topTracks) {
    const spotifyId = track.spotifyUrl?.match(/\/(track|album)\/([a-zA-Z0-9]{22})/)?.[2];
    let reason = "";
    if (isGenericArtworkFallback(track.coverArt)) {
      reason = spotifyId && !spotifyCoverHash(spotifyId) ? "missing-spotify-hash" : "generic-fallback";
    } else if (!track.coverArt.includes("scdn.co") && !track.coverArt.includes("/images/genres/") && !track.coverArt.includes("youtube.com") && !track.coverArt.includes("ytimg.com")) {
      reason = "non-standard-url";
    }
    if (reason) {
      issues.push({ artist: artist.slug, title: track.title, kind: "track", coverArt: track.coverArt, reason });
    }
  }
  for (const release of [...artist.albums, ...artist.eps, ...artist.singles]) {
    if (isGenericArtworkFallback(release.coverArt)) {
      issues.push({
        artist: artist.slug,
        title: release.title,
        kind: "release",
        coverArt: release.coverArt,
        reason: "generic-fallback",
      });
    }
  }
}

const lines = [
  "# Track artwork audit",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  "## Summary",
  "",
  `| Metric | Count |`,
  `| --- | --- |`,
  `| Catalog tracks | ${catalogTracks.length} |`,
  `| Catalog releases | ${catalogReleases.length} |`,
  `| Issues | ${issues.length} |`,
  "",
];

if (issues.length) {
  lines.push("## Issues", "");
  for (const i of issues) {
    lines.push(`- **${i.artist}** — ${i.title} (${i.kind}): ${i.reason} \`${i.coverArt}\``);
  }
} else {
  lines.push("_All track cards have Spotify or genre placeholder artwork._");
}

const outDir = join(process.cwd(), "reports");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "track-artwork-audit.md");
writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

console.log(lines.join("\n"));
console.log(`\nReport: ${outPath}`);
if (issues.length) process.exitCode = 1;
