import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  collectAssetReferences,
  localPathForPublicAsset
} from "./manifest-asset-audit.mjs";

export function getTrackedPublicAssetFindings({
  manifestPath = "apps/web/public/deck/manifest.json",
  publicRoot = "apps/web/public",
  trackedFiles = getGitTrackedFiles()
} = {}) {
  const findings = [];
  if (!trackedFiles) {
    return [{
      path: manifestPath,
      reason: "unable to inspect Git tracking with git ls-files"
    }];
  }

  const tracked = new Set(trackedFiles.map(normalizePath));

  if (!tracked.has(normalizePath(manifestPath))) {
    findings.push({
      path: manifestPath,
      reason: "manifest is not tracked"
    });
  }

  if (!fs.existsSync(manifestPath)) return findings;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const references = collectAssetReferences(manifest)
    .map((reference) => localPathForPublicAsset(reference.value, publicRoot))
    .filter(Boolean)
    .filter((assetPath) => normalizePath(assetPath).startsWith(`${normalizePath(publicRoot)}/deck/`));

  const sample = [...new Set(references)].slice(0, 80);
  for (const assetPath of sample) {
    if (fs.existsSync(assetPath) && !tracked.has(normalizePath(assetPath))) {
      findings.push({
        path: assetPath,
        reason: "asset exists locally but is not tracked"
      });
    }
  }

  return findings;
}

export function getGitTrackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return null;
  }
}

function normalizePath(filePath) {
  return path.normalize(filePath).split(path.sep).join("/");
}
