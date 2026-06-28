#!/usr/bin/env npx tsx
/**
 * Sync all API sources for a single artist.
 * Usage: npm run sync:artist -- sara-landry
 */
import { syncSingleArtist } from "../../src/lib/ingestion/sync";
import { clearIngestedMetadataCache } from "../../src/content/artists/metadata";

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run sync:artist -- <artist-slug>");
    process.exit(1);
  }

  console.log(`Syncing all sources for ${slug}…\n`);
  const metadata = await syncSingleArtist(slug);
  clearIngestedMetadataCache();

  console.log(JSON.stringify(metadata, null, 2));
  console.log(`\nWritten to data/ingestion/artists/${slug}.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
