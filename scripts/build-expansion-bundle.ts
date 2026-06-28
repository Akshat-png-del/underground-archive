#!/usr/bin/env npx tsx
/**
 * Bundle data/catalog-expansion/*.json → src/content/artists/metadata/expansions.json
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { CatalogExpansion } from "../src/lib/catalog/types";

const SRC_DIR = join(process.cwd(), "data/catalog-expansion");
const BUNDLE = join(process.cwd(), "src/content/artists/metadata/expansions.json");

function main() {
  const bundle: Record<string, CatalogExpansion> = {};

  if (existsSync(SRC_DIR)) {
    for (const file of readdirSync(SRC_DIR)) {
      if (!file.endsWith(".json")) continue;
      try {
        const data = JSON.parse(readFileSync(join(SRC_DIR, file), "utf8")) as CatalogExpansion;
        bundle[data.slug] = data;
      } catch {
        // skip invalid
      }
    }
  }

  writeFileSync(BUNDLE, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  console.log(`Bundled ${Object.keys(bundle).length} expansions → ${BUNDLE}`);
}

main();
