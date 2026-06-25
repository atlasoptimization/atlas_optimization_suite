import fs from "node:fs";
import {
  localPathForPublicAsset
} from "./manifest-asset-audit.mjs";

const preferredFields = [
  "frontReadingImage",
  "frontImage",
  "backReadingImage",
  "backImage",
  "pdfPath"
];

export function smokeAssetUrls({
  distManifestPath = "apps/web/dist/deck/manifest.json",
  distRoot = "apps/web/dist"
} = {}) {
  const result = {
    checked: [],
    missing: []
  };

  if (!fs.existsSync(distManifestPath)) {
    result.missing.push({
      label: "manifest",
      field: "manifest",
      manifestPath: distManifestPath,
      expectedPath: distManifestPath
    });
    return result;
  }

  const manifest = JSON.parse(fs.readFileSync(distManifestPath, "utf8"));
  const cards = Array.isArray(manifest.cards) ? manifest.cards : [];
  const aspectCard =
    cards.find((card) => card.id === "aspect-the-aspect") ??
    cards.find((card) => card.domain === "Aspect") ??
    cards[0];
  const artCard = cards.find((card) => card.imagePath) ?? aspectCard;

  const references = [];
  if (aspectCard) {
    for (const field of preferredFields) {
      if (aspectCard[field]) {
        references.push({
          label: aspectCard.cardname ?? aspectCard.id ?? "sample card",
          field,
          manifestPath: aspectCard[field]
        });
      }
    }
  }
  if (artCard?.imagePath) {
    references.push({
      label: artCard.cardname ?? artCard.id ?? "sample art",
      field: "imagePath",
      manifestPath: artCard.imagePath
    });
  }

  for (const reference of references) {
    const expectedPath = localPathForPublicAsset(reference.manifestPath, distRoot);
    const entry = {
      ...reference,
      expectedPath
    };
    result.checked.push(entry);
    if (!expectedPath || !fs.existsSync(expectedPath)) {
      result.missing.push(entry);
    }
  }

  return result;
}
