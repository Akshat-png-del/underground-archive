#!/usr/bin/env npx tsx
import "dotenv/config";

import { syncAllArtists } from "../../src/lib/ingestion/sync";
import { isYoutubeConfigured } from "../../src/lib/ingestion/youtube";

async function main() {
  if (!isYoutubeConfigured()) {
    console.error("Set YOUTUBE_API_KEY in .env.local");
    process.exit(1);
  }

  console.log("Syncing YouTube channel metadata for all artists…\n");
  await syncAllArtists({ providers: ["youtube"], delayMs: 250 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
