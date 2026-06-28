import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ArtistIngestedMetadata } from "../src/lib/ingestion/types";
import { ARTISTS_METADATA_DIR } from "../src/lib/ingestion/config";

const BUNDLE_PATH = join(process.cwd(), "src/content/artists/metadata/ingested.json");

function main() {
  const dir = join(process.cwd(), ARTISTS_METADATA_DIR);
  const bundle: Record<string, ArtistIngestedMetadata> = {};

  if (existsSync(dir)) {
    for (const file of readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const data = JSON.parse(readFileSync(join(dir, file), "utf8")) as ArtistIngestedMetadata;
        bundle[data.slug] = data;
      } catch {
        // skip
      }
    }
  }

  writeFileSync(BUNDLE_PATH, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Bundled ${Object.keys(bundle).length} artists → ${BUNDLE_PATH}`);
}

main();
