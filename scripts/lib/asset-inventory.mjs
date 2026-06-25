import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import {
  collectAssetReferences,
  localPathForPublicAsset
} from "./manifest-asset-audit.mjs";

const publicDeckRoot = "apps/web/public/deck";
const publicRoot = "apps/web/public";
const manifestPath = path.join(publicDeckRoot, "manifest.json");
const distRoot = "apps/web/dist";
const cardAssetFields = new Set([
  "imagePath",
  "frontImage",
  "backImage",
  "frontThumbImage",
  "backThumbImage",
  "frontReadingImage",
  "backReadingImage",
  "pdfPath"
]);

export function buildAssetInventory() {
  dotenv.config({ path: ".env.local", quiet: true });

  const publicFiles = collectFiles(publicDeckRoot).map(fileEntry);
  const manifest = readJson(manifestPath);
  const manifestReferences = manifest
    ? collectCardAssetReferences(manifest)
    : [];
  const referencedLocalPaths = new Set(
    manifestReferences
      .map((reference) => localPathForPublicAsset(reference.value, publicRoot))
      .filter(Boolean)
      .map(normalizePath)
  );
  const referencedFiles = publicFiles.filter((entry) => referencedLocalPaths.has(normalizePath(entry.path)));
  const unreferencedFiles = publicFiles.filter((entry) => !referencedLocalPaths.has(normalizePath(entry.path)));
  const trackedFiles = getGitTrackedFiles();
  const trackedSet = trackedFiles ? new Set(trackedFiles.map(normalizePath)) : null;
  const trackedPublicFiles = trackedSet
    ? publicFiles.filter((entry) => trackedSet.has(normalizePath(entry.path)))
    : [];
  const trackedDistFiles = trackedSet
    ? collectFiles(distRoot).map(fileEntry).filter((entry) => trackedSet.has(normalizePath(entry.path)))
    : [];

  return {
    roots: getConfiguredRoots(),
    sizeSummary: getSizeSummary(),
    extensionSummary: summarizeByExtension(publicFiles),
    largestPublicFiles: sortBySize(publicFiles).slice(0, 50),
    duplicateCandidates: findDuplicateCandidates(publicFiles).slice(0, 80),
    manifestUsage: {
      referenceCount: manifestReferences.length,
      referencedAssetCount: referencedFiles.length,
      referencedSize: sumSizes(referencedFiles),
      unreferencedCount: unreferencedFiles.length,
      unreferencedSize: sumSizes(unreferencedFiles),
      unreferencedLargestFiles: sortBySize(unreferencedFiles).slice(0, 50),
      missingReferences: manifestReferences
        .map((reference) => ({
          ...reference,
          localPath: localPathForPublicAsset(reference.value, publicRoot)
        }))
        .filter((reference) => reference.localPath && !fs.existsSync(reference.localPath))
    },
    gitTracking: {
      available: Boolean(trackedSet),
      trackedPublicCount: trackedPublicFiles.length,
      trackedPublicSize: sumSizes(trackedPublicFiles),
      trackedPublicLargestFiles: sortBySize(trackedPublicFiles).slice(0, 50),
      trackedDistCount: trackedDistFiles.length,
      trackedDistSize: sumSizes(trackedDistFiles),
      trackedDistLargestFiles: sortBySize(trackedDistFiles).slice(0, 20)
    },
    files: {
      publicFiles,
      referencedFiles,
      unreferencedFiles,
      trackedPublicFiles
    }
  };
}

export function buildCleanupPlan(inventory = buildAssetInventory()) {
  const trackedSet = new Set(inventory.files.trackedPublicFiles.map((entry) => normalizePath(entry.path)));
  const duplicatePaths = new Set(
    inventory.duplicateCandidates.flatMap((candidate) => candidate.files.map((entry) => normalizePath(entry.path)))
  );
  const largeThreshold = 5 * 1024 * 1024;

  return {
    generatedAt: new Date().toISOString(),
    referencedByManifest: inventory.files.referencedFiles.slice(0, 80),
    unreferencedPossiblyStatic: inventory.files.unreferencedFiles
      .filter((entry) => isPossiblyStaticAsset(entry.path))
      .slice(0, 80),
    likelyStaleDuplicates: inventory.files.unreferencedFiles
      .filter((entry) => duplicatePaths.has(normalizePath(entry.path)))
      .slice(0, 80),
    veryLarge: sortBySize(inventory.files.publicFiles.filter((entry) => entry.size >= largeThreshold)).slice(0, 80),
    trackedByGit: inventory.files.publicFiles
      .filter((entry) => trackedSet.has(normalizePath(entry.path)))
      .slice(0, 80),
    duplicateCandidates: inventory.duplicateCandidates.slice(0, 40),
    summary: {
      publicDeckSize: sizeOf(publicDeckRoot),
      referencedSize: inventory.manifestUsage.referencedSize,
      unreferencedSize: inventory.manifestUsage.unreferencedSize,
      trackedPublicSize: inventory.gitTracking.trackedPublicSize
    }
  };
}

export function formatInventoryText(inventory) {
  const lines = [];
  lines.push("Asset inventory");
  lines.push("");
  lines.push("Environment/config roots:");
  for (const [label, value] of Object.entries(inventory.roots)) {
    lines.push(`- ${label}: ${value ?? "not available"}`);
  }

  lines.push("");
  lines.push("Size summary:");
  for (const entry of inventory.sizeSummary) {
    lines.push(`- ${entry.label}: ${formatBytes(entry.size)}${entry.exists ? "" : " (missing)"}`);
  }

  lines.push("");
  lines.push("Counts by extension under apps/web/public/deck:");
  for (const entry of inventory.extensionSummary) {
    lines.push(`- ${entry.extension}: ${entry.count} files, ${formatBytes(entry.size)}`);
  }

  lines.push("");
  lines.push("Largest 50 files under apps/web/public/deck:");
  appendFileList(lines, inventory.largestPublicFiles);

  lines.push("");
  lines.push("Duplicate candidates:");
  if (inventory.duplicateCandidates.length === 0) {
    lines.push("- none found");
  } else {
    for (const candidate of inventory.duplicateCandidates.slice(0, 50)) {
      lines.push(`- ${candidate.key}: ${candidate.files.length} files, ${formatBytes(sumSizes(candidate.files))}`);
      for (const file of candidate.files.slice(0, 6)) {
        lines.push(`  - ${formatBytes(file.size)} ${file.path}`);
      }
      if (candidate.files.length > 6) lines.push(`  - ...and ${candidate.files.length - 6} more`);
    }
  }

  lines.push("");
  lines.push("Manifest usage:");
  lines.push(`- referenced asset path fields: ${inventory.manifestUsage.referenceCount}`);
  lines.push(`- referenced files present: ${inventory.manifestUsage.referencedAssetCount}`);
  lines.push(`- referenced size: ${formatBytes(inventory.manifestUsage.referencedSize)}`);
  lines.push(`- unreferenced files: ${inventory.manifestUsage.unreferencedCount}`);
  lines.push(`- unreferenced size: ${formatBytes(inventory.manifestUsage.unreferencedSize)}`);
  lines.push(`- missing referenced files: ${inventory.manifestUsage.missingReferences.length}`);
  if (inventory.manifestUsage.missingReferences.length > 0) {
    for (const reference of inventory.manifestUsage.missingReferences.slice(0, 20)) {
      lines.push(`  - ${reference.path}: ${reference.value} -> ${reference.localPath}`);
    }
  }

  lines.push("");
  lines.push("Largest 50 unreferenced files:");
  appendFileList(lines, inventory.manifestUsage.unreferencedLargestFiles);

  lines.push("");
  lines.push("Git tracking:");
  if (!inventory.gitTracking.available) {
    lines.push("- git tracking unavailable from this environment");
  } else {
    lines.push(`- tracked files under apps/web/public/deck: ${inventory.gitTracking.trackedPublicCount}`);
    lines.push(`- tracked size under apps/web/public/deck: ${formatBytes(inventory.gitTracking.trackedPublicSize)}`);
    lines.push(`- tracked files under apps/web/dist: ${inventory.gitTracking.trackedDistCount}`);
    lines.push(`- tracked size under apps/web/dist: ${formatBytes(inventory.gitTracking.trackedDistSize)}`);
    lines.push("- largest tracked public deck files:");
    appendFileList(lines, inventory.gitTracking.trackedPublicLargestFiles);
    if (inventory.gitTracking.trackedDistCount > 0) {
      lines.push("- largest tracked dist files:");
      appendFileList(lines, inventory.gitTracking.trackedDistLargestFiles);
    }
  }

  return `${lines.join("\n")}\n`;
}

export function formatCleanupPlanMarkdown(plan) {
  const lines = [];
  lines.push("# Asset Cleanup Plan");
  lines.push("");
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push("");
  lines.push("This report is diagnostic only. It does not delete files and does not change sync behavior.");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Public deck size: ${formatBytes(plan.summary.publicDeckSize)}`);
  lines.push(`- Referenced manifest asset size: ${formatBytes(plan.summary.referencedSize)}`);
  lines.push(`- Unreferenced public deck size: ${formatBytes(plan.summary.unreferencedSize)}`);
  lines.push(`- Tracked public deck size: ${formatBytes(plan.summary.trackedPublicSize)}`);
  lines.push("");

  appendMarkdownFileSection(lines, "Referenced By Manifest", plan.referencedByManifest);
  appendMarkdownFileSection(lines, "Unreferenced But Possibly Required Static Assets", plan.unreferencedPossiblyStatic);
  appendMarkdownFileSection(lines, "Likely Stale Duplicates", plan.likelyStaleDuplicates);
  appendMarkdownFileSection(lines, "Very Large Files", plan.veryLarge);
  appendMarkdownFileSection(lines, "Tracked By Git", plan.trackedByGit);

  lines.push("## Duplicate Candidate Groups");
  lines.push("");
  if (plan.duplicateCandidates.length === 0) {
    lines.push("- None found.");
  } else {
    for (const candidate of plan.duplicateCandidates) {
      lines.push(`- \`${candidate.key}\`: ${candidate.files.length} files, ${formatBytes(sumSizes(candidate.files))}`);
      for (const file of candidate.files.slice(0, 8)) {
        lines.push(`  - ${formatBytes(file.size)} \`${file.path}\``);
      }
    }
  }
  lines.push("");
  lines.push("## Proposed Safe Next Steps");
  lines.push("");
  lines.push("1. Review this report alongside `pnpm audit:asset-inventory`.");
  lines.push("2. Confirm which public runtime forms are required: compressed PDFs, one desk preview set, one thumbnail/art set, backgrounds, handbook.");
  lines.push("3. Only after review, adjust sync output rules in a separate branch.");
  lines.push("4. Regenerate public assets and run all deployment audits before deleting generated files.");
  lines.push("5. Treat Git history cleanup as a separate, higher-risk operation after a backup.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function getConfiguredRoots() {
  return {
    "CSV root": process.env.DECK_CSV_ROOT,
    "PDF root": process.env.DECK_PDF_ROOT,
    "compressed PDF root": process.env.DECK_COMPRESSED_PDF_ROOT,
    "image root": process.env.DECK_IMAGE_ROOT,
    "compressed image root": process.env.DECK_COMPRESSED_IMAGE_ROOT,
    "custom domain root": process.env.CUSTOM_DOMAINS_ROOT ?? "custom_domains (default)",
    "public deck output root": publicDeckRoot
  };
}

function getSizeSummary() {
  const targets = [
    ["apps/web/public/deck", publicDeckRoot],
    ["apps/web/public/deck/manifest.json", manifestPath],
    ["apps/web/public/deck/pdfs", path.join(publicDeckRoot, "pdfs")],
    ["apps/web/public/deck/pdf-previews", path.join(publicDeckRoot, "pdf-previews")],
    ["apps/web/public/deck/images", path.join(publicDeckRoot, "images")],
    ["apps/web/public/deck/icons", path.join(publicDeckRoot, "icons")],
    ["apps/web/public/deck/backgrounds", path.join(publicDeckRoot, "backgrounds")],
    ["apps/web/public/deck/handbook", path.join(publicDeckRoot, "handbook")],
    ["apps/web/public/deck/custom-domains", path.join(publicDeckRoot, "custom-domains")],
    ["apps/web/dist", distRoot]
  ];
  return targets.map(([label, target]) => ({
    label,
    path: target,
    exists: fs.existsSync(target),
    size: sizeOf(target)
  }));
}

function collectCardAssetReferences(manifest) {
  if (!manifest || typeof manifest !== "object") return [];
  const references = [];
  for (const [index, card] of (manifest.cards ?? []).entries()) {
    for (const [field, value] of Object.entries(card)) {
      if (cardAssetFields.has(field) && typeof value === "string" && value.trim()) {
        references.push({
          field,
          value,
          path: `cards.${index}.${field}`,
          cardId: card.id,
          cardname: card.cardname,
          domain: card.domain
        });
      }
    }
  }
  return references;
}

function summarizeByExtension(files) {
  const wanted = [".pdf", ".png", ".webp", ".jpg", ".jpeg", ".json"];
  const summary = new Map(wanted.map((extension) => [extension, { extension, count: 0, size: 0 }]));
  for (const file of files) {
    const extension = path.extname(file.path).toLowerCase() || "(none)";
    if (!summary.has(extension)) summary.set(extension, { extension, count: 0, size: 0 });
    const entry = summary.get(extension);
    entry.count += 1;
    entry.size += file.size;
  }
  return [...summary.values()].filter((entry) => entry.count > 0 || wanted.includes(entry.extension));
}

function findDuplicateCandidates(files) {
  const byStem = new Map();
  for (const file of files) {
    const parsed = path.parse(file.path);
    const exactStem = path.join(parsed.dir, parsed.name).replace(/\\/g, "/");
    addDuplicateCandidate(byStem, exactStem, file);

    const cardStem = parsed.name
      .replace(/_(front|back)_(thumb|reading)$/i, "_$1")
      .replace(/_(thumb|reading)$/i, "");
    const semanticStem = path.join(parsed.dir.replace(/\/(thumb|reading)(\/|$)/, "/$2"), cardStem)
      .replace(/\\/g, "/");
    if (semanticStem !== exactStem) addDuplicateCandidate(byStem, semanticStem, file);
  }

  return [...byStem.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      key,
      files: sortBySize(group)
    }))
    .sort((left, right) => sumSizes(right.files) - sumSizes(left.files));
}

function addDuplicateCandidate(map, key, file) {
  const group = map.get(key) ?? [];
  group.push(file);
  map.set(key, group);
}

function isPossiblyStaticAsset(filePath) {
  return /\/(backgrounds|handbook|icons|custom-domains)\//.test(normalizePath(filePath)) ||
    /manifest\.json$/.test(filePath);
}

function appendMarkdownFileSection(lines, title, files) {
  lines.push(`## ${title}`);
  lines.push("");
  if (files.length === 0) {
    lines.push("- No examples found.");
  } else {
    for (const file of files.slice(0, 50)) {
      lines.push(`- ${formatBytes(file.size)} \`${file.path}\``);
    }
    if (files.length > 50) lines.push(`- ...and ${files.length - 50} more`);
  }
  lines.push("");
}

function appendFileList(lines, files) {
  if (files.length === 0) {
    lines.push("- no files found");
    return;
  }
  for (const entry of files) {
    lines.push(`- ${formatBytes(entry.size)} ${entry.path}`);
  }
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
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

function fileEntry(filePath) {
  return {
    path: normalizePath(filePath),
    size: fs.statSync(filePath).size,
    extension: path.extname(filePath).toLowerCase() || "(none)"
  };
}

function sortBySize(files) {
  return [...files].sort((left, right) => right.size - left.size);
}

function sumSizes(files) {
  return files.reduce((total, file) => total + file.size, 0);
}

function sizeOf(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return stat.size;
  return collectFiles(target).reduce((total, filePath) => total + fs.statSync(filePath).size, 0);
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(1)} ${unit}`;
}

function getGitTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return null;
  }
}

function normalizePath(filePath) {
  return path.normalize(filePath).split(path.sep).join("/");
}
