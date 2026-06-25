import fs from "node:fs";
import path from "node:path";
import {
  collectAssetReferences,
  localPathForPublicAsset
} from "./manifest-asset-audit.mjs";

const cardAssetFields = new Set([
  "frontThumbImage",
  "backThumbImage",
  "frontImage",
  "backImage",
  "frontReadingImage",
  "backReadingImage",
  "imagePath",
  "pdfPath"
]);

export function auditPublicBuildAssets({
  publicManifestPath = "apps/web/public/deck/manifest.json",
  distManifestPath = "apps/web/dist/deck/manifest.json",
  publicRoot = "apps/web/public",
  distRoot = "apps/web/dist"
} = {}) {
  const findings = [];

  if (!fs.existsSync(publicManifestPath)) {
    findings.push({
      cardDomain: "",
      cardName: "",
      field: "manifest",
      manifestPath: publicManifestPath,
      expectedPublicPath: publicManifestPath,
      expectedDistPath: distManifestPath,
      missingPublic: true,
      missingDist: !fs.existsSync(distManifestPath)
    });
    return findings;
  }

  const manifest = JSON.parse(fs.readFileSync(publicManifestPath, "utf8"));

  for (const card of manifest.cards ?? []) {
    for (const field of cardAssetFields) {
      const manifestPath = card[field];
      if (!manifestPath || isRemoteAsset(manifestPath)) continue;

      const expectedPublicPath = localPathForPublicAsset(manifestPath, publicRoot);
      const expectedDistPath = localPathForPublicAsset(manifestPath, distRoot);
      const missingPublic = !expectedPublicPath || !fs.existsSync(expectedPublicPath);
      const missingDist = !expectedDistPath || !fs.existsSync(expectedDistPath);

      if (missingPublic || missingDist) {
        findings.push({
          cardDomain: card.domain ?? "",
          cardName: card.cardname ?? card.id ?? "",
          field,
          manifestPath,
          expectedPublicPath,
          expectedDistPath,
          missingPublic,
          missingDist
        });
      }
    }
  }

  // Include non-card runtime assets such as handbook and topology backgrounds.
  for (const reference of collectAssetReferences({
    handbook: manifest.handbook,
    topologyBackgrounds: manifest.topologyBackgrounds
  })) {
    if (isRemoteAsset(reference.value)) continue;
    const expectedPublicPath = localPathForPublicAsset(reference.value, publicRoot);
    const expectedDistPath = localPathForPublicAsset(reference.value, distRoot);
    const missingPublic = !expectedPublicPath || !fs.existsSync(expectedPublicPath);
    const missingDist = !expectedDistPath || !fs.existsSync(expectedDistPath);
    if (missingPublic || missingDist) {
      findings.push({
        cardDomain: "",
        cardName: reference.path,
        field: reference.field,
        manifestPath: reference.value,
        expectedPublicPath,
        expectedDistPath,
        missingPublic,
        missingDist
      });
    }
  }

  return findings;
}

function isRemoteAsset(value) {
  return /^(https?:|blob:|data:)/i.test(value);
}
