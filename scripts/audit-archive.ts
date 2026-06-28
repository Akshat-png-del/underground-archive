#!/usr/bin/env npx tsx
/**
 * Archive authenticity QA — run before production builds.
 * Usage: npm run audit:archive
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  assertArchiveIntegrity,
  formatAuditReport,
  runArchiveAudit,
} from "../src/lib/archive/audit";

const report = runArchiveAudit();
const markdown = formatAuditReport(report);
const outDir = join(process.cwd(), "reports");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "archive-audit.md");
writeFileSync(outPath, markdown, "utf8");

console.log(markdown);
console.log(`\nReport written to ${outPath}`);

try {
  assertArchiveIntegrity(report);
  console.log("\n✓ Archive integrity check passed (no broken entries).");
  process.exit(0);
} catch (error) {
  console.error(`\n✗ ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}
