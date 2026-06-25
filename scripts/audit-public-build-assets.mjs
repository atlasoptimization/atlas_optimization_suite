import { auditPublicBuildAssets } from "./lib/public-build-asset-audit.mjs";

const findings = auditPublicBuildAssets();

if (findings.length > 0) {
  console.error(`Public build asset audit failed: ${findings.length} missing references`);
  for (const finding of findings.slice(0, 50)) {
    console.error(`- ${finding.cardDomain} / ${finding.cardName}`);
    console.error(`  field: ${finding.field}`);
    console.error(`  manifest: ${finding.manifestPath}`);
    console.error(`  public: ${finding.expectedPublicPath}${finding.missingPublic ? " MISSING" : ""}`);
    console.error(`  dist:   ${finding.expectedDistPath}${finding.missingDist ? " MISSING" : ""}`);
  }
  if (findings.length > 50) {
    console.error(`...and ${findings.length - 50} more missing references`);
  }
  process.exit(1);
}

console.log("Public build asset audit passed.");
