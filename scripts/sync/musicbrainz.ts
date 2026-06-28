#!/usr/bin/env npx tsx
import { syncAllArtists } from "../../src/lib/ingestion/sync";

async function main() {
  console.log("Syncing MusicBrainz metadata for all artists…");
  console.log("(Rate limited — ~1 req/sec, this may take several minutes)\n");
  await syncAllArtists({ providers: ["musicbrainz"], delayMs: 0 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
