import { getTrackedPublicAssetFindings } from "./lib/public-assets-tracked.mjs";

const findings = getTrackedPublicAssetFindings();

if (findings.length > 0) {
  console.warn("Public deck assets are not fully tracked.");
  for (const finding of findings.slice(0, 40)) {
    console.warn(`- ${finding.path}: ${finding.reason}`);
  }
  if (findings.length > 40) {
    console.warn(`...and ${findings.length - 40} more untracked sampled assets`);
  }
  console.warn("Asset exists locally but is not tracked. GitHub Pages will not receive it. Run git add -f apps/web/public/deck.");
  process.exit(1);
}

console.log("Public deck tracked-assets check passed.");
