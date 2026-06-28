#!/usr/bin/env npx tsx
/**
 * Multi-source portrait ingestion: Spotify → Discogs → Beatport → RA → website.
 * Never overwrites verified registry / research portraits.
 * Usage: npm run sync:portraits
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getArtistSeeds } from "../../src/lib/ingestion/seeds";
import {
  loadOrCreateMetadata,
  updateManifestCount,
  writeArtistMetadata,
} from "../../src/lib/ingestion/store";
import { syncArtistPortrait } from "../../src/lib/ingestion/portraits";
import {
  buildPortraitSyncReport,
  formatPortraitSyncReport,
} from "../../src/lib/ingestion/portrait-report";
import { sleep } from "../../src/lib/ingestion/http";

async function main() {
  const seeds = getArtistSeeds();
  let found = 0;
  let missing = 0;
  let protectedCount = 0;
  let unchanged = 0;

  console.log(
    `Syncing portraits for ${seeds.length} artists (Spotify → Discogs → Beatport → RA → website)…\n`
  );

  for (const seed of seeds) {
    const metadata = loadOrCreateMetadata(seed);
    const result = await syncArtistPortrait(metadata);

    if (result.status === "found") {
      writeArtistMetadata(metadata);
      console.log(`✓ ${seed.slug} (${result.source})`);
      found++;
    } else if (result.status === "protected") {
      console.log(`⊘ ${seed.slug} (verified — skipped)`);
      protectedCount++;
    } else if (result.status === "unchanged") {
      writeArtistMetadata(metadata);
      console.log(`= ${seed.slug} (kept existing ${result.source})`);
      unchanged++;
    } else {
      writeArtistMetadata(metadata);
      console.log(`– ${seed.slug} (no portrait found)`);
      missing++;
    }

    await sleep(400);
  }

  updateManifestCount();
  execSync("npx tsx scripts/build-metadata-bundle.ts", { stdio: "inherit" });

  const report = buildPortraitSyncReport();
  const markdown = formatPortraitSyncReport(report);
  const outDir = join(process.cwd(), "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "portrait-sync.md");
  writeFileSync(outPath, markdown, "utf8");

  console.log(`\nSync: ${found} new/updated, ${unchanged} unchanged, ${missing} missing, ${protectedCount} protected`);
  console.log(
    `Coverage: ${report.totals.found}/${report.totals.artists} (${report.totals.coveragePercent}%) — target ${report.totals.targetMet ? "met" : "NOT met"}`
  );
  console.log(`Report: ${outPath}\n`);
  console.log(markdown);

  if (!report.totals.targetMet) {
    console.warn(
      `\n⚠ Coverage below 80% — review missing artists in ${outPath}`
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
