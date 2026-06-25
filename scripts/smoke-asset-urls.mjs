import { smokeAssetUrls } from "./lib/asset-url-smoke.mjs";

const result = smokeAssetUrls();

if (result.missing.length > 0) {
  console.error(`Asset URL smoke test failed: ${result.missing.length} missing representative assets`);
  for (const finding of result.missing) {
    console.error(`- ${finding.label}`);
    console.error(`  field: ${finding.field}`);
    console.error(`  manifest: ${finding.manifestPath}`);
    console.error(`  dist: ${finding.expectedPath ?? "(unresolved)"}`);
  }
  process.exit(1);
}

console.log(`Asset URL smoke test passed. Checked ${result.checked.length} representative assets.`);
