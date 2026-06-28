#!/usr/bin/env npx tsx
import { syncAllArtists } from "../../src/lib/ingestion/sync";
import { isDiscogsConfigured } from "../../src/lib/ingestion/discogs";

async function main() {
  if (!isDiscogsConfigured()) {
    console.error("Set DISCOGS_TOKEN in .env.local");
    process.exit(1);
  }

  console.log("Syncing Discogs metadata for all artists…\n");
  await syncAllArtists({ providers: ["discogs"], delayMs: 1100 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
