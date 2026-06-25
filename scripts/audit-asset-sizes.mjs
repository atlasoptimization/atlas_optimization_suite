import fs from "node:fs";
import path from "node:path";

const deckRoot = "apps/web/public/deck";
const targets = [
  ["manifest.json", path.join(deckRoot, "manifest.json"), 5 * 1024 * 1024],
  ["pdfs", path.join(deckRoot, "pdfs"), 500 * 1024 * 1024],
  ["pdf-previews", path.join(deckRoot, "pdf-previews"), 300 * 1024 * 1024],
  ["thumb previews", path.join(deckRoot, "pdf-previews", "thumb"), undefined],
  ["reading previews", path.join(deckRoot, "pdf-previews", "reading"), 500 * 1024 * 1024],
  ["images", path.join(deckRoot, "images"), 200 * 1024 * 1024],
  ["backgrounds", path.join(deckRoot, "backgrounds"), undefined],
  ["custom-domains", path.join(deckRoot, "custom-domains"), undefined],
  ["total deck", deckRoot, 1024 * 1024 * 1024]
];

console.log("Asset size audit:");

for (const [label, target, warningLimit] of targets) {
  const size = sizeOf(target);
  const warning = warningLimit && size > warningLimit ? "  WARNING" : "";
  console.log(`- ${label}: ${formatBytes(size)}${warning}`);
}

console.log("");
console.log("Largest files:");

const files = collectFiles(deckRoot)
  .map((file) => ({ file, size: fs.statSync(file).size }))
  .sort((left, right) => right.size - left.size);

for (const entry of files.slice(0, 30)) {
  const isLargePreview =
    entry.file.includes(`${path.sep}pdf-previews${path.sep}reading${path.sep}`) && entry.size > 3 * 1024 * 1024;
  console.log(`- ${formatBytes(entry.size)} ${entry.file}${isLargePreview ? "  WARNING reading preview > 3 MB" : ""}`);
}

if (files.length === 0) {
  console.log("- no files found");
}

const manifestPath = path.join(deckRoot, "manifest.json");
if (fs.existsSync(manifestPath)) {
  const manifestText = fs.readFileSync(manifestPath, "utf8");
  if (manifestText.includes("base64") || manifestText.includes("data:image")) {
    console.log("");
    console.log("WARNING manifest contains base64 or data:image content");
  }
}

function sizeOf(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  return collectFiles(target).reduce((total, file) => total + fs.statSync(file).size, 0);
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) return [root];

  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(1)} ${unit}`;
}
