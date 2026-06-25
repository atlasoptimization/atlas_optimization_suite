import { auditManifestAssets } from "./lib/manifest-asset-audit.mjs";

const result = auditManifestAssets();

console.log(`Manifest asset references: ${result.references.length}`);
console.log("Asset counts by extension:");
for (const [extension, count] of Object.entries(result.extensionCounts).sort()) {
  console.log(`- ${extension}: ${count}`);
}

if (result.warnings.length > 0) {
  console.log("");
  console.log(`Warnings: ${result.warnings.length}`);
  for (const warning of result.warnings.slice(0, 20)) {
    console.log(`- ${warning.path} -> ${warning.value} (${warning.reason})`);
  }
  if (result.warnings.length > 20) {
    console.log(`...and ${result.warnings.length - 20} more warnings`);
  }
}

if (result.missing.length > 0) {
  console.error("");
  console.error(`Missing required manifest assets: ${result.missing.length}`);
  for (const missing of result.missing.slice(0, 40)) {
    console.error(`- ${missing.path ?? missing.field}: ${missing.value}`);
    console.error(`  expected: ${missing.localPath}`);
  }
  if (result.missing.length > 40) {
    console.error(`...and ${result.missing.length - 40} more missing assets`);
  }
  process.exit(1);
}

console.log("Manifest asset audit passed.");
