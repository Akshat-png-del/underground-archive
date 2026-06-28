#!/usr/bin/env npx tsx
/**
 * Artist image authenticity audit — verified photography only.
 * Usage: npm run audit:images
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { formatImageAuditReport, runImageAudit } from "../src/lib/archive/images/audit";

const report = runImageAudit();
const markdown = formatImageAuditReport(report);
const outDir = join(process.cwd(), "reports");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "image-audit.md");
writeFileSync(outPath, markdown, "utf8");

console.log(markdown);
console.log(`\nReport written to ${outPath}`);

if (report.totals.suspicious > 0 || report.totals.broken > 0) {
  console.warn(
    `\n⚠ ${report.totals.suspicious} suspicious and ${report.totals.broken} broken image assignments — review before publishing portraits.`
  );
}

console.log(
  `\nImage coverage: ${report.totals.verified}/${report.totals.artists} verified (${report.totals.coveragePercent}%)`
);
