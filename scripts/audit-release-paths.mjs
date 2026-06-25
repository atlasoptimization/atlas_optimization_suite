import fs from "node:fs";
import path from "node:path";

const roots = ["apps/web/dist", "apps/web/public/deck"];
const textExtensions = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".txt",
  ".md",
  ".svg",
  ".map"
]);
const forbiddenPatterns = [
  "/home/",
  "/Desktop/",
  "file://",
  "Card_game_full",
  "Scribus_setup",
  "/mnt/data/"
];

const findings = roots.flatMap((root) => collectFiles(root)).flatMap(scanFile);

if (findings.length > 0) {
  console.error("Forbidden private/runtime paths found:");
  for (const finding of findings) {
    console.error(`${finding.file} [${finding.pattern}] ${finding.snippet}`);
  }
  process.exit(1);
}

console.log("Release path audit passed.");

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  const stat = fs.statSync(root);
  if (stat.isFile()) return textExtensions.has(path.extname(root)) ? [root] : [];

  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(fullPath));
    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) files.push(fullPath);
  }
  return files;
}

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const findings = [];

  for (const pattern of forbiddenPatterns) {
    const index = text.indexOf(pattern);
    if (index === -1) continue;
    findings.push({
      file,
      pattern,
      snippet: snippetAround(text, index)
    });
  }

  return findings;
}

function snippetAround(text, index) {
  return text
    .slice(Math.max(0, index - 80), Math.min(text.length, index + 160))
    .replace(/\s+/g, " ")
    .trim();
}
