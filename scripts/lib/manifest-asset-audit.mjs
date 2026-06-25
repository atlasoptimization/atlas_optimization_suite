import fs from "node:fs";
import path from "node:path";

const defaultAssetFields = new Set([
  "imagePath",
  "frontImage",
  "backImage",
  "frontThumbImage",
  "backThumbImage",
  "frontReadingImage",
  "backReadingImage",
  "pdfPath",
  "iconPath",
  "handbookPath"
]);

export function auditManifestAssets({
  manifestPath = "apps/web/public/deck/manifest.json",
  publicRoot = "apps/web/public",
  optionalPdf = true
} = {}) {
  const result = {
    manifestPath,
    publicRoot,
    references: [],
    missing: [],
    warnings: [],
    extensionCounts: {}
  };

  if (!fs.existsSync(manifestPath)) {
    result.missing.push({
      field: "manifest",
      value: manifestPath,
      localPath: manifestPath,
      reason: "manifest file missing"
    });
    return result;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  collectAssetReferences(manifest).forEach((reference) => {
    const localPath = localPathForPublicAsset(reference.value, publicRoot);
    const extension = path.extname(localPath || reference.value).toLowerCase() || "(none)";
    result.extensionCounts[extension] = (result.extensionCounts[extension] ?? 0) + 1;

    const entry = {
      ...reference,
      localPath
    };
    result.references.push(entry);

    if (isRemoteAsset(reference.value)) return;
    if (!localPath || fs.existsSync(localPath)) return;

    if (optionalPdf && extension === ".pdf") {
      result.warnings.push({
        ...entry,
        reason: "optional PDF asset missing"
      });
      return;
    }

    result.missing.push({
      ...entry,
      reason: "referenced asset missing"
    });
  });

  return result;
}

export function collectAssetReferences(value, trail = []) {
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => collectAssetReferences(entry, [...trail, String(index)]));
  }

  const references = [];
  for (const [key, entry] of Object.entries(value)) {
    if (key === "raw") continue;
    const nextTrail = [...trail, key];
    if (typeof entry === "string" && isAssetField(key, entry)) {
      references.push({
        field: key,
        value: entry,
        path: nextTrail.join(".")
      });
      continue;
    }
    if (entry && typeof entry === "object") {
      references.push(...collectAssetReferences(entry, nextTrail));
    }
  }
  return references;
}

export function localPathForPublicAsset(assetPath, publicRoot = "apps/web/public") {
  if (!assetPath || isRemoteAsset(assetPath)) return null;

  let normalized = assetPath.trim();
  normalized = normalized.replace(/^\/data_science_deck\//, "");
  normalized = normalized.replace(/^\/+/, "");

  if (normalized.startsWith("apps/web/public/")) return normalized;
  if (normalized.startsWith("public/")) return path.join("apps/web", normalized);
  if (normalized.startsWith("deck/")) return path.join(publicRoot, normalized);
  return path.join(publicRoot, normalized);
}

function isAssetField(key, value) {
  if (defaultAssetFields.has(key)) return true;
  if (looksLikeRuntimeAsset(value)) return true;
  if (/Path$|Image$|ImagePath$|Url$|URL$/.test(key) && looksLikeRuntimeAsset(value)) return true;
  return false;
}

function looksLikeRuntimeAsset(value) {
  return /^(\/data_science_deck\/)?\/?deck\//.test(value) || /\.(png|webp|jpe?g|svg|pdf|json)$/i.test(value);
}

function isRemoteAsset(value) {
  return /^(https?:|blob:|data:)/i.test(value);
}
