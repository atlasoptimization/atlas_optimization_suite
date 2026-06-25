import fs from "node:fs";
import path from "node:path";
import {
  buildAssetInventory,
  buildCleanupPlan,
  formatCleanupPlanMarkdown,
  formatBytes
} from "./lib/asset-inventory.mjs";

const reportPath = "reports/asset-cleanup-plan.md";
const inventory = buildAssetInventory();
const plan = buildCleanupPlan(inventory);
const markdown = formatCleanupPlanMarkdown(plan);

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, markdown, "utf8");

console.log(`Asset cleanup plan written to ${reportPath}`);
console.log(`Public deck size: ${formatBytes(plan.summary.publicDeckSize)}`);
console.log(`Referenced size: ${formatBytes(plan.summary.referencedSize)}`);
console.log(`Unreferenced size: ${formatBytes(plan.summary.unreferencedSize)}`);
