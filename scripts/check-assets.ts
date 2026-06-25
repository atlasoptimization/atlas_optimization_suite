import dotenv from "dotenv";
import {
  validateManifestFromLocalAssets,
  type AssetValidationIssue
} from "@dsd/deck-assets";
import type { DeckAssetConfig } from "@dsd/deck-assets";

dotenv.config({ path: ".env.local" });

function formatIssue(issue: AssetValidationIssue) {
  const parts = [issue.message];
  if (issue.domain) parts.push(`domain: ${issue.domain}`);
  if (issue.cardname) parts.push(`card: ${issue.cardname}`);
  return parts.join(" | ");
}

function main() {
  const config: DeckAssetConfig = {
    csvRoot: process.env.DECK_CSV_ROOT ?? "",
    imageRoot: process.env.DECK_IMAGE_ROOT ?? "",
    pdfRoot: process.env.DECK_PDF_ROOT ?? "",
    outRoot: "apps/web/public/deck",
    outImageRoot: "apps/web/public/deck/images",
    outPdfRoot: "apps/web/public/deck/pdfs",
    outManifest: "apps/web/public/deck/manifest.json"
  };
  const report = validateManifestFromLocalAssets(config);

  console.log("Deck asset health report");
  console.log("");
  console.log(`Cards found: ${report.cardCount}`);
  console.log("Counts by domain:");
  for (const [domain, count] of Object.entries(report.countsByDomain)) {
    console.log(`- ${domain}: ${count}`);
  }

  console.log("");
  console.log(`Missing images: ${report.missingImageCount}`);
  console.log(`Missing PDFs: ${report.missingPdfCount}`);
  console.log(`Missing required semantic fields: ${report.missingRequiredFieldCount}`);
  console.log(`Duplicate card names: ${report.duplicateCardNames.length}`);
  console.log(`Duplicate card IDs: ${report.duplicateIds.length}`);

  if (report.errors.length > 0) {
    console.log("");
    console.log("Errors:");
    for (const error of report.errors) {
      console.log(`- ${formatIssue(error)}`);
    }
  }

  if (report.warnings.length > 0) {
    console.log("");
    console.log("Top warnings:");
    for (const warning of report.warnings.slice(0, 80)) {
      console.log(`- ${formatIssue(warning)}`);
    }
    if (report.warnings.length > 80) {
      console.log(`... ${report.warnings.length - 80} more warnings`);
    }
  }

  const shouldFail = report.errors.length > 0;
  if (shouldFail) {
    process.exitCode = 1;
  }
}

main();
