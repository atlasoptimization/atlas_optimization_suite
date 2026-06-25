import path from "node:path";
import type { DeckAssetConfig } from "./types";

export function loadDeckAssetConfig(env: NodeJS.ProcessEnv = process.env): DeckAssetConfig {
  const csvRoot = env.DECK_CSV_ROOT;
  const imageRoot = env.DECK_IMAGE_ROOT;
  const pdfRoot = env.DECK_PDF_ROOT;
  const compressedImageRoot = env.DECK_COMPRESSED_IMAGE_ROOT;
  const compressedPdfRoot = env.DECK_COMPRESSED_PDF_ROOT;
  const configuredIconRoot = env.DECK_ICON_ROOT;
  const customDomainsRoot = path.resolve(env.CUSTOM_DOMAINS_ROOT || "custom_domains");
  const handbookPdf = path.resolve(env.HANDBOOK_PDF_PATH || "../Handbook/Latex/handbook.pdf");
  const topologyBackgroundRoot = path.resolve(env.TOPOLOGY_BACKGROUNDS_ROOT || "backgrounds");
  const pdfPreviewDpi = parsePositiveInteger(env.PDF_PREVIEW_DPI, 600);
  const pdfPreviewThumbHeight = parsePositiveInteger(env.PDF_PREVIEW_THUMB_HEIGHT, 700);
  const pdfPreviewReadingHeight = parsePositiveInteger(env.PDF_PREVIEW_READING_HEIGHT, 1600);
  const pdfPreviewFormat = env.PDF_PREVIEW_FORMAT === "png" ? "png" : "webp";
  const pdfPreviewWebpQuality = parsePositiveInteger(env.PDF_PREVIEW_WEBP_QUALITY, 85);

  if (!csvRoot) throw new Error("Missing DECK_CSV_ROOT in .env.local");
  if (!imageRoot) throw new Error("Missing DECK_IMAGE_ROOT in .env.local");
  if (!pdfRoot) throw new Error("Missing DECK_PDF_ROOT in .env.local");

  const inferredIconRoot = path.join(path.dirname(imageRoot), "Icons");
  const iconRoot = configuredIconRoot || inferredIconRoot;
  const outRoot = path.resolve("apps/web/public/deck");
  const outImageRoot = path.join(outRoot, "images");
  const outPdfRoot = path.join(outRoot, "pdfs");
  const outIconRoot = path.join(outRoot, "icons");
  const outPdfPreviewRoot = path.join(outRoot, "pdf-previews");
  const outManifest = path.join(outRoot, "manifest.json");

  return {
    csvRoot,
    imageRoot,
    pdfRoot,
    fallbackImageRoot: compressedImageRoot ? imageRoot : undefined,
    fallbackPdfRoot: compressedPdfRoot ? pdfRoot : undefined,
    iconRoot,
    pdfPreviewDpi,
    pdfPreviewThumbHeight,
    pdfPreviewReadingHeight,
    pdfPreviewFormat,
    pdfPreviewWebpQuality,
    outRoot,
    outImageRoot,
    outPdfRoot,
    outIconRoot,
    outPdfPreviewRoot,
    outManifest,
    customDomainsRoot,
    handbookPdf,
    topologyBackgroundRoot,
    includeCustomDomains: true,
    includePdfs: true,
    includePreviews: true,
    includeHandbook: true,
    includeBackgrounds: true,
    includeIcons: true
  };
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
