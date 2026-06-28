#!/usr/bin/env npx tsx
import { syncAllArtists } from "../../src/lib/ingestion/sync";
import { isSpotifyConfigured } from "../../src/lib/ingestion/spotify";
import { writeManifest, readManifest } from "../../src/lib/ingestion/store";

async function main() {
  if (!isSpotifyConfigured()) {
    console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .env.local");
    process.exit(1);
  }

  console.log("Syncing Spotify metadata for all artists…\n");
  await syncAllArtists({ providers: ["spotify"], delayMs: 200 });

  const manifest = readManifest();
  manifest.lastFullSync = new Date().toISOString();
  writeManifest(manifest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
