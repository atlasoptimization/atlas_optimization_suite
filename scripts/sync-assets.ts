import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { buildManifestFromLocalAssets, loadDeckAssetConfig } from "@dsd/deck-assets";
import { loadDeploymentProfile } from "./lib/profile-config";

dotenv.config({ path: ".env.local" });

function main() {
  const profile = loadDeploymentProfile(readProfileArg());
  if (profile.id === "public-demo" && missingDeckSourceRoots()) {
    writePublicDemoFallbackManifest();
    return;
  }
  const baseConfig = loadDeckAssetConfig();
  const publicRoots = profile.id === "public-demo" ? resolvePublicAssetRoots(baseConfig) : null;
  const config = {
    ...baseConfig,
    imageRoot: publicRoots?.imageRoot ?? baseConfig.imageRoot,
    pdfRoot: publicRoots?.pdfRoot ?? baseConfig.pdfRoot,
    fallbackImageRoot: publicRoots?.fallbackImageRoot ?? baseConfig.fallbackImageRoot,
    fallbackPdfRoot: publicRoots?.fallbackPdfRoot ?? baseConfig.fallbackPdfRoot,
    iconRoot: publicRoots?.iconRoot ?? baseConfig.iconRoot,
    pdfPreviewDpi:
      profile.id === "public-demo"
        ? parsePositiveInteger(process.env.PUBLIC_PREVIEW_DPI, 120)
        : baseConfig.pdfPreviewDpi,
    pdfPreviewThumbHeight:
      profile.id === "public-demo"
        ? parsePositiveInteger(process.env.PUBLIC_PREVIEW_THUMB_HEIGHT, baseConfig.pdfPreviewThumbHeight)
        : baseConfig.pdfPreviewThumbHeight,
    pdfPreviewReadingHeight:
      profile.id === "public-demo"
        ? parsePositiveInteger(process.env.PUBLIC_PREVIEW_READING_HEIGHT, baseConfig.pdfPreviewReadingHeight)
        : baseConfig.pdfPreviewReadingHeight,
    pdfPreviewFormat:
      profile.id === "public-demo" && process.env.PUBLIC_PREVIEW_FORMAT === "png"
        ? "png"
        : baseConfig.pdfPreviewFormat,
    pdfPreviewWebpQuality:
      profile.id === "public-demo"
        ? parsePositiveInteger(process.env.PUBLIC_PREVIEW_WEBP_QUALITY, baseConfig.pdfPreviewWebpQuality)
        : baseConfig.pdfPreviewWebpQuality,
    usingCompressedImageRoot: Boolean(publicRoots?.usingCompressedImageRoot),
    usingCompressedPdfRoot: Boolean(publicRoots?.usingCompressedPdfRoot),
    cleanOutRoot: profile.id === "public-demo",
    includedDomains: profile.assets.includedDomains,
    includeCustomDomains: profile.assets.includeCustomDomains,
    includePdfs: profile.assets.includePdfs,
    includePreviews: profile.assets.includePreviews,
    includeHandbook: profile.assets.includeHandbook,
    includeBackgrounds: profile.assets.includeBackgrounds,
    includeIcons: profile.assets.includeIcons
  };
  const summary = buildManifestFromLocalAssets(config);

  console.log("");
  console.log(`Profile: ${profile.id}`);
  console.log("Asset roots:");
  console.log(`- CSV root: ${config.csvRoot}`);
  console.log(`- image root: ${config.imageRoot}`);
  console.log(`- PDF root: ${config.pdfRoot}`);
  console.log(`- compressed image root used: ${config.usingCompressedImageRoot ? "yes" : "no"}`);
  console.log(`- compressed PDF root used: ${config.usingCompressedPdfRoot ? "yes" : "no"}`);
  console.log(`- output public deck: ${config.outRoot}`);
  console.log(`Wrote ${summary.cardCount} cards to ${summary.manifestPath}`);
  console.log(`Custom domains found: ${summary.customDomainsFound}`);
  console.log(`Custom domain cards loaded: ${summary.customCardsLoaded}`);
  console.log(`Handbook bundled: ${summary.handbookPath ?? "not found"}`);
  console.log(`Topology background domains: ${Object.keys(summary.topologyBackgrounds).length}`);
  if (summary.customDomainIgnoredFolders.length > 0) {
    console.log(`Ignored custom-domain folders: ${summary.customDomainIgnoredFolders.join(", ")}`);
  }
  if (summary.customDomainDetails.length > 0) {
    console.log("Custom domain details:");
    for (const detail of summary.customDomainDetails) {
      console.log(`- ${detail}`);
    }
  }
  console.log("");
  console.log("PDF previews:");
  console.log(`- renderer: ${summary.pdfPreview.renderer ?? "none"}`);
  console.log(`- legacy DPI setting: ${summary.pdfPreview.dpi}`);
  console.log(`- output format: ${summary.pdfPreview.format}`);
  console.log(`- thumbnail max height: ${summary.pdfPreview.thumbHeight}px`);
  console.log(`- reading max height: ${summary.pdfPreview.readingHeight}px`);
  console.log(`- PDFs matched: ${summary.pdfPreview.pdfsMatched}`);
  console.log(`- front previews generated: ${summary.pdfPreview.frontPreviewsGenerated}`);
  console.log(`- back previews generated: ${summary.pdfPreview.backPreviewsGenerated}`);
  console.log(`- previews skipped: ${summary.pdfPreview.previewsSkipped}`);
  if (summary.pdfPreview.sampleDimensions.length > 0) {
    console.log("- sample dimensions:");
    for (const sample of summary.pdfPreview.sampleDimensions) {
      console.log(`  - ${sample}`);
    }
  }

  if (summary.warnings.length > 0) {
    console.log("");
    console.log("Warnings:");
    for (const warning of summary.warnings.slice(0, 80)) {
      console.log(`- ${warning}`);
    }
    if (summary.warnings.length > 80) {
      console.log(`... ${summary.warnings.length - 80} more warnings`);
    }
  }

  console.log("");
  console.log("Public deck size:");
  console.log(`- total: ${formatBytes(directorySize(config.outRoot))}`);
  console.log(`- manifest: ${formatBytes(fileSize(config.outManifest))}`);
  console.log(`- images: ${formatBytes(directorySize(config.outImageRoot))}`);
  console.log(`- PDFs: ${formatBytes(directorySize(config.outPdfRoot))}`);
  console.log(`- previews: ${formatBytes(directorySize(config.outPdfPreviewRoot))}`);
}

main();

function readProfileArg() {
  const profileFlagIndex = process.argv.indexOf("--profile");
  if (profileFlagIndex >= 0) return process.argv[profileFlagIndex + 1];
  const inlineProfile = process.argv.find((arg) => arg.startsWith("--profile="));
  if (inlineProfile) return inlineProfile.slice("--profile=".length);
  return process.env.DSD_PROFILE;
}

function missingDeckSourceRoots() {
  return !process.env.DECK_CSV_ROOT || !process.env.DECK_IMAGE_ROOT || !process.env.DECK_PDF_ROOT;
}

function resolvePublicAssetRoots(config: ReturnType<typeof loadDeckAssetConfig>) {
  const compressedPdfRoot = existingDirectory(
    process.env.DECK_COMPRESSED_PDF_ROOT || inferCompressedPdfRoot(config.pdfRoot)
  );
  const compressedImageRoot = existingDirectory(
    resolveCompressedImageRoot(process.env.DECK_COMPRESSED_IMAGE_ROOT, config.imageRoot)
  );

  return {
    pdfRoot: compressedPdfRoot ?? config.pdfRoot,
    imageRoot: compressedImageRoot ?? config.imageRoot,
    iconRoot: config.iconRoot,
    fallbackPdfRoot: compressedPdfRoot ? config.pdfRoot : config.fallbackPdfRoot,
    fallbackImageRoot: compressedImageRoot ? config.imageRoot : config.fallbackImageRoot,
    usingCompressedPdfRoot: Boolean(compressedPdfRoot),
    usingCompressedImageRoot: Boolean(compressedImageRoot)
  };
}

function resolveCompressedImageRoot(configuredRoot: string | undefined, originalImageRoot: string) {
  const candidates: string[] = [];
  if (configuredRoot) {
    candidates.push(path.join(configuredRoot, "Card_graphics"), configuredRoot);
  }

  const imageRootParent = path.dirname(originalImageRoot);
  const imageRootGrandparent = path.dirname(imageRootParent);
  candidates.push(
    path.join(imageRootGrandparent, "images_compressed", path.basename(originalImageRoot)),
    path.join(imageRootGrandparent, "images_compressed")
  );

  return candidates.find(existingDirectory) ?? configuredRoot;
}

function inferCompressedPdfRoot(originalPdfRoot: string) {
  return path.join(path.dirname(originalPdfRoot), "output_compressed");
}

function existingDirectory(candidate: string | undefined) {
  return candidate && fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()
    ? candidate
    : null;
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function directorySize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += directorySize(full);
    if (entry.isFile()) total += fs.statSync(full).size;
  }
  return total;
}

function fileSize(file: string) {
  return fs.existsSync(file) ? fs.statSync(file).size : 0;
}

function formatBytes(bytes: number) {
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

function writePublicDemoFallbackManifest() {
  const outRoot = path.resolve("apps/web/public/deck");
  const outManifest = path.join(outRoot, "manifest.json");
  fs.mkdirSync(outRoot, { recursive: true });

  if (fs.existsSync(outManifest)) {
    console.log("Profile: public-demo");
    console.log(`Using existing public deck manifest at ${outManifest}`);
    console.log("No private deck source roots were available.");
    return;
  }

  fs.writeFileSync(
    outManifest,
    JSON.stringify(
      {
        version: "0.1.0",
        generatedAt: new Date().toISOString(),
        domains: [],
        cardCount: 0,
        cards: []
      },
      null,
      2
    ),
    "utf8"
  );
  console.log("Profile: public-demo");
  console.log(`Wrote fallback public demo manifest to ${outManifest}`);
  console.log("No private deck source roots were available.");
}
