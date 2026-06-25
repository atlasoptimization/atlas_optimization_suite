import fs from "node:fs";
import path from "node:path";
import {
  ART_IMAGE_FIELD_NAMES,
  buildExpectedPdfFilename,
  findBestAsset,
  findBestPdfAsset,
  resolveCsvArtAsset
} from "./assetMatching";
import { copyAsset } from "./copyAsset";
import { parseCsv } from "./csv";
import { DOMAINS } from "./domains";
import { ASPECT_MODIFIER_FALLBACK } from "./constants";
import { scanCustomDomainCards } from "./customDomains";
import { getField } from "./fields";
import { ensureDir, firstCsvInDomain, listFilesRecursive } from "./files";
import {
  browserPathForPublicDeckFile,
  detectPdfRenderer,
  renderPdfPagePreview,
  renderPdfPageToPng
} from "./pdfPreview";
import { slugify } from "./slugify";
import type {
  BuildManifestSummary,
  DeckAssetConfig,
  ManifestCard,
  TopologyBackgroundManifest,
  TopologyBackgroundSource
} from "./types";

export function buildManifestFromLocalAssets(
  config: DeckAssetConfig
): BuildManifestSummary {
  if (config.cleanOutRoot) cleanGeneratedDeckOutput(config);
  ensureDir(config.outRoot);
  ensureDir(config.outImageRoot);
  ensureDir(config.outPdfRoot);
  ensureDir(config.outIconRoot);
  ensureDir(config.outPdfPreviewRoot);

  const cards: ManifestCard[] = [];
  const warnings: string[] = [];
  const resolvedPdfAssets = new Map<string, string[]>();
  const resolvedImageAssets = new Map<string, { card: string; artReference: string }[]>();
  const handbookPath = config.includeHandbook === false ? null : copyHandbookPdf(config, warnings);
  const topologyBackgrounds = config.includeBackgrounds === false ? {} : copyTopologyBackgrounds(config, warnings);
  const pdfRenderer = config.includePreviews === false ? null : detectPdfRenderer();
  const previewFormat =
    config.pdfPreviewFormat === "webp" && pdfRenderer?.webpCommand ? "webp" : "png";
  const pdfPreview = {
    renderer: pdfRenderer?.name ?? null,
    dpi: config.pdfPreviewDpi,
    thumbHeight: config.pdfPreviewThumbHeight,
    readingHeight: config.pdfPreviewReadingHeight,
    format: previewFormat,
    pdfsMatched: 0,
    frontPreviewsGenerated: 0,
    backPreviewsGenerated: 0,
    previewsSkipped: 0,
    sampleDimensions: [] as string[]
  };

  if (config.includePreviews !== false && !pdfRenderer) {
    warnings.push(
      "PDF preview generation skipped: no supported PDF renderer found. Install poppler-utils for pdftoppm."
    );
  }

  if (config.includeIcons !== false) copyDomainIcons(config, warnings);

  const includedDomains = new Set(config.includedDomains ?? DOMAINS);

  for (const domain of DOMAINS) {
    if (!includedDomains.has(domain)) continue;
    const csvFile = firstCsvInDomain(config.csvRoot, domain);

    if (!csvFile) {
      warnings.push(`No CSV found for domain ${domain}`);
      continue;
    }

    const imageRoot = path.join(config.imageRoot, domain);
    const fallbackImageRoot = config.fallbackImageRoot ? path.join(config.fallbackImageRoot, domain) : null;
    const imageFiles = [
      ...listFilesRecursive(imageRoot),
      ...(fallbackImageRoot && fs.existsSync(fallbackImageRoot) ? listFilesRecursive(fallbackImageRoot) : [])
    ];
    const primaryImageFiles = listFilesRecursive(imageRoot);
    const pdfRoot = path.join(config.pdfRoot, domain);
    const fallbackPdfRoot = config.fallbackPdfRoot ? path.join(config.fallbackPdfRoot, domain) : null;
    const pdfFiles = [
      ...listFilesRecursive(pdfRoot),
      ...(fallbackPdfRoot && fs.existsSync(fallbackPdfRoot) ? listFilesRecursive(fallbackPdfRoot) : [])
    ];

    const rows = parseCsv(csvFile);

    for (const row of rows) {
      const cardname = getField(row, [
        "cardname",
        "card_name",
        "Card Name",
        "name",
        "Name",
        "title",
        "Title"
      ]);

      if (!cardname) {
        warnings.push(`Skipped row without card name in ${csvFile}`);
        continue;
      }

      const domainSlug = slugify(domain);
      const cardSlug = slugify(cardname);
      const id = `${domainSlug}-${cardSlug}`;

      const artReference = getField(row, ART_IMAGE_FIELD_NAMES, "");
      // Art images are resolved from the CSV art/image field first. Card-name
      // filename guessing is only a legacy fallback when the CSV has no art field.
      const explicitImage = resolveCsvArtAsset({
        artReference,
        files: imageFiles,
        searchRoots: [
          imageRoot,
          config.imageRoot,
          ...(fallbackImageRoot ? [fallbackImageRoot, config.fallbackImageRoot ?? ""] : []),
          path.dirname(csvFile)
        ],
        exts: config.usingCompressedImageRoot
          ? [".webp", ".png", ".jpg", ".jpeg"]
          : [".png", ".webp", ".jpg", ".jpeg"]
      });
      const image =
        explicitImage ??
        findBestAsset(
          config.usingCompressedImageRoot ? primaryImageFiles : imageFiles,
          cardname,
          config.usingCompressedImageRoot
            ? [".webp", ".png", ".jpg", ".jpeg"]
            : [".png", ".webp", ".jpg", ".jpeg"]
        ) ??
        (config.usingCompressedImageRoot
          ? findBestAsset(imageFiles, cardname, [".webp", ".png", ".jpg", ".jpeg"])
          : null);

      const nr = getField(row, ["nr", "Nr", "number", "Number", "card_number", "Card Number"]);
      const pdf = config.includePdfs === false ? null : findBestPdfAsset(pdfFiles, domain, nr, cardname);
      recordResolvedAsset(resolvedPdfAssets, pdf, `${domain} / nr=${nr || "missing"} / ${cardname}`);
      recordResolvedImageAsset(resolvedImageAssets, image, {
        card: `${domain} / nr=${nr || "missing"} / ${cardname}`,
        artReference
      });

      const imagePath = copyAsset(
        image,
        path.join(config.outImageRoot, domainSlug),
        cardSlug,
        config.outRoot
      );

      const pdfPath =
        config.includePdfs === false
          ? null
          : copyAsset(
              pdf,
              path.join(config.outPdfRoot, domainSlug),
              cardSlug,
              config.outRoot
            );

      let frontThumbImage: string | null = null;
      let backThumbImage: string | null = null;
      let frontImage: string | null = null;
      let backImage: string | null = null;
      let frontReadingImage: string | null = null;
      let backReadingImage: string | null = null;

      if (pdf && config.includePreviews !== false) {
        pdfPreview.pdfsMatched += 1;
        if (pdfRenderer) {
          const previews = renderCardPreviewPair({
            config,
            pdfRenderer,
            pdf,
            domainSlug,
            cardSlug,
            domain,
            cardname,
            previewFormat,
            warnings,
            pdfPreview
          });
          frontThumbImage = previews.frontThumbImage;
          backThumbImage = previews.backThumbImage;
          frontReadingImage = previews.frontReadingImage;
          backReadingImage = previews.backReadingImage;
          frontImage = frontReadingImage ?? frontThumbImage;
          backImage = backReadingImage ?? backThumbImage;
        } else {
          pdfPreview.previewsSkipped += 2;
        }
      }

      if (artReference && !explicitImage) {
        warnings.push(`CSV art image not found for ${domain} / ${cardname}: ${artReference}`);
      }
      if (!artReference && imagePath) {
        warnings.push(`Used legacy card-name image fallback for ${domain} / ${cardname}. Add an art/image CSV field to make this explicit.`);
      }
      if (!imagePath) warnings.push(`No image matched for ${domain} / ${cardname}`);
      if (config.includePdfs !== false && !pdfPath) {
        const expected = nr ? buildExpectedPdfFilename(domain, nr, cardname) : "missing row number";
        warnings.push(
          `No PDF matched for ${domain} / nr=${nr || "missing"} / ${cardname}. Expected something like ${expected}`
        );
      }

      const keywordsRaw = getField(row, ["keywords", "keyword", "tags"], "");
      const effectMod = getField(row, ["effect_mod", "effectMod", "modifier", "mod"], "");

      cards.push({
        id,
        cardname,
        domain,
        subdomain: getField(row, ["subdomain", "Subdomain"], ""),
        summary: getField(row, ["summary", "Summary"], ""),
        twin: getField(row, ["twin", "scientific_twin", "Scientific Twin", "scientific twin"], ""),
        keywords: keywordsRaw
          .split(/[,;]+/)
          .map((keyword) => keyword.trim())
          .filter(Boolean),
        question: getField(row, ["question", "Question"], ""),
        story: getField(row, ["story", "Story"], ""),
        effectGood: getField(row, ["effect_good", "effectGood", "virtue", "good"], ""),
        effectBad: getField(row, ["effect_bad", "effectBad", "pathology", "bad"], ""),
        effectMod: domain === "Aspect" && !effectMod ? ASPECT_MODIFIER_FALLBACK : effectMod,
        frontThumbImage,
        backThumbImage,
        frontImage,
        backImage,
        frontReadingImage,
        backReadingImage,
        imagePath,
        pdfPath,
        raw: row
      });
    }

    console.log(`Loaded ${rows.length} rows from ${domain}: ${csvFile}`);
  }

  const customDomainSummary =
    config.includeCustomDomains === false
      ? {
          cards: [],
          warnings: [],
          domainsFound: 0,
          cardsLoaded: 0,
          details: [],
          ignoredFolders: []
        }
      : scanCustomDomainCards(config, pdfRenderer, pdfPreview);
  cards.push(...customDomainSummary.cards);
  warnings.push(...customDomainSummary.warnings);
  warnings.push(...duplicateAssetWarnings("PDF", resolvedPdfAssets));
  warnings.push(...duplicateImageWarnings(resolvedImageAssets));
  const manifestDomains = [
    ...DOMAINS,
    ...new Set(
      customDomainSummary.cards
        .map((card) => card.domain)
        .filter((domain) => !DOMAINS.includes(domain as (typeof DOMAINS)[number]))
    )
  ];

  const manifest = {
    version: "0.1.0",
    generatedAt: new Date().toISOString(),
    handbook: handbookPath ? { pdfPath: handbookPath } : undefined,
    topologyBackgrounds,
    domains: manifestDomains,
    cardCount: cards.length,
    cards
  };

  fs.writeFileSync(config.outManifest, JSON.stringify(manifest, null, 2), "utf8");

  return {
    cardCount: cards.length,
    customDomainsFound: customDomainSummary.domainsFound,
    customCardsLoaded: customDomainSummary.cardsLoaded,
    customDomainDetails: customDomainSummary.details,
    customDomainIgnoredFolders: customDomainSummary.ignoredFolders,
    handbookPath,
    topologyBackgrounds,
    warnings,
    manifestPath: config.outManifest,
    pdfPreview
  };
}

function cleanGeneratedDeckOutput(config: DeckAssetConfig) {
  const entries = [
    "backgrounds",
    "custom-domains",
    "handbook",
    "icons",
    "images",
    "pdf-previews",
    "pdfs",
    "manifest.json"
  ];

  for (const entry of entries) {
    fs.rmSync(path.join(config.outRoot, entry), { recursive: true, force: true });
  }
}

const TOPOLOGY_BACKGROUND_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function copyTopologyBackgrounds(
  config: DeckAssetConfig,
  warnings: string[]
): TopologyBackgroundManifest {
  if (!fs.existsSync(config.topologyBackgroundRoot)) {
    warnings.push("Topology backgrounds not bundled: no backgrounds/ folder found.");
    return {};
  }

  const outBackgroundRoot = path.join(config.outRoot, "backgrounds");
  ensureDir(outBackgroundRoot);
  const manifest: TopologyBackgroundManifest = {};

  for (const sourceFile of listFilesRecursive(config.topologyBackgroundRoot)) {
    const extension = path.extname(sourceFile).toLowerCase();
    if (!TOPOLOGY_BACKGROUND_EXTENSIONS.has(extension)) continue;

    const matched = classifyTopologyBackground(path.basename(sourceFile));
    if (!matched) continue;

    const target = path.join(outBackgroundRoot, path.basename(sourceFile));
    fs.copyFileSync(sourceFile, target);
    manifest[matched.domain] = {
      ...manifest[matched.domain],
      [matched.source]: browserPathForPublicDeckFile(config.outRoot, target)
    };
  }

  if (Object.keys(manifest).length === 0) {
    warnings.push("No topology background images matched BG_<Domain>, Zonal_BG_<Domain>, or Uniform_BG_<Domain>.");
  }

  return manifest;
}

export function classifyTopologyBackground(filename: string): {
  domain: string;
  source: TopologyBackgroundSource;
} | null {
  const basename = path.basename(filename, path.extname(filename));
  const patterns: Array<{ prefix: string; source: TopologyBackgroundSource }> = [
    { prefix: "Uniform_BG_", source: "uniform" },
    { prefix: "Zonal_BG_", source: "zonal" },
    { prefix: "BG_", source: "thematic" }
  ];

  for (const pattern of patterns) {
    if (!basename.toLowerCase().startsWith(pattern.prefix.toLowerCase())) continue;
    const domain = basename.slice(pattern.prefix.length).trim();
    return domain ? { domain, source: pattern.source } : null;
  }

  return null;
}

function copyHandbookPdf(config: DeckAssetConfig, warnings: string[]) {
  if (!fs.existsSync(config.handbookPdf)) {
    warnings.push("Handbook PDF not bundled: set HANDBOOK_PDF_PATH or build ../Handbook/Latex/handbook.pdf.");
    return null;
  }

  const handbookDir = path.join(config.outRoot, "handbook");
  ensureDir(handbookDir);
  const target = path.join(handbookDir, "handbook.pdf");
  fs.copyFileSync(config.handbookPdf, target);
  return browserPathForPublicDeckFile(config.outRoot, target);
}

function recordResolvedAsset(
  assets: Map<string, string[]>,
  assetPath: string | null,
  card: string
) {
  if (!assetPath) return;
  assets.set(assetPath, [...(assets.get(assetPath) ?? []), card]);
}

function recordResolvedImageAsset(
  assets: Map<string, { card: string; artReference: string }[]>,
  assetPath: string | null,
  entry: { card: string; artReference: string }
) {
  if (!assetPath) return;
  assets.set(assetPath, [...(assets.get(assetPath) ?? []), entry]);
}

function duplicateAssetWarnings(kind: string, assets: Map<string, string[]>) {
  return [...assets.entries()].flatMap(([assetPath, cards]) =>
    cards.length > 1
      ? [`${kind} asset used by multiple cards unexpectedly: ${path.basename(assetPath)} -> ${cards.join("; ")}`]
      : []
  );
}

function duplicateImageWarnings(
  assets: Map<string, { card: string; artReference: string }[]>
) {
  return [...assets.entries()].flatMap(([assetPath, entries]) => {
    if (entries.length <= 1) return [];
    const explicitReferences = new Set(
      entries.map((entry) => entry.artReference.trim()).filter(Boolean)
    );
    if (explicitReferences.size === 1 && explicitReferences.values().next().value) return [];
    return [
      `Art image used by multiple cards unexpectedly: ${path.basename(assetPath)} -> ${entries.map((entry) => entry.card).join("; ")}`
    ];
  });
}

function recordPreviewDimensions(
  samples: string[],
  domain: string,
  cardname: string,
  face: "front" | "back",
  preview: { width?: number; height?: number }
) {
  if (samples.length >= 8 || !preview.width || !preview.height) return;
  samples.push(`${domain} / ${cardname} ${face}: ${preview.width}x${preview.height}`);
}

function renderCardPreviewPair({
  config,
  pdfRenderer,
  pdf,
  domainSlug,
  cardSlug,
  domain,
  cardname,
  previewFormat,
  warnings,
  pdfPreview
}: {
  config: DeckAssetConfig;
  pdfRenderer: NonNullable<ReturnType<typeof detectPdfRenderer>>;
  pdf: string;
  domainSlug: string;
  cardSlug: string;
  domain: string;
  cardname: string;
  previewFormat: "png" | "webp";
  warnings: string[];
  pdfPreview: BuildManifestSummary["pdfPreview"];
}) {
  const extension = previewFormat;
  const thumbDir = path.join(config.outPdfPreviewRoot, "thumb", domainSlug);
  const readingDir = path.join(config.outPdfPreviewRoot, "reading", domainSlug);
  const frontThumbPath = path.join(thumbDir, `${cardSlug}_front_thumb.${extension}`);
  const backThumbPath = path.join(thumbDir, `${cardSlug}_back_thumb.${extension}`);
  const frontReadingPath = path.join(readingDir, `${cardSlug}_front_reading.${extension}`);
  const backReadingPath = path.join(readingDir, `${cardSlug}_back_reading.${extension}`);
  const result = {
    frontThumbImage: null as string | null,
    backThumbImage: null as string | null,
    frontReadingImage: null as string | null,
    backReadingImage: null as string | null
  };

  const jobs = [
    {
      page: 1,
      face: "front" as const,
      kind: "thumb" as const,
      targetHeight: config.pdfPreviewThumbHeight,
      outputPath: frontThumbPath
    },
    {
      page: 2,
      face: "back" as const,
      kind: "thumb" as const,
      targetHeight: config.pdfPreviewThumbHeight,
      outputPath: backThumbPath
    },
    {
      page: 1,
      face: "front" as const,
      kind: "reading" as const,
      targetHeight: config.pdfPreviewReadingHeight,
      outputPath: frontReadingPath
    },
    {
      page: 2,
      face: "back" as const,
      kind: "reading" as const,
      targetHeight: config.pdfPreviewReadingHeight,
      outputPath: backReadingPath
    }
  ];

  for (const job of jobs) {
    const preview = renderPdfPagePreview(pdfRenderer, pdf, job.page, job.outputPath, {
      targetHeight: job.targetHeight,
      format: previewFormat,
      webpQuality: config.pdfPreviewWebpQuality
    });
    if (!preview.ok) {
      warnings.push(`PDF ${job.kind} ${job.face} preview failed for ${domain} / ${cardname} page ${job.page}`);
      pdfPreview.previewsSkipped += 1;
      continue;
    }

    if (!fs.existsSync(job.outputPath)) {
      warnings.push(`PDF ${job.kind} ${job.face} preview missing after render for ${domain} / ${cardname}: ${job.outputPath}`);
      pdfPreview.previewsSkipped += 1;
      continue;
    }

    const browserPath = browserPathForPublicDeckFile(config.outRoot, job.outputPath);
    if (job.kind === "thumb" && job.face === "front") result.frontThumbImage = browserPath;
    if (job.kind === "thumb" && job.face === "back") result.backThumbImage = browserPath;
    if (job.kind === "reading" && job.face === "front") result.frontReadingImage = browserPath;
    if (job.kind === "reading" && job.face === "back") result.backReadingImage = browserPath;

    if (job.face === "front") pdfPreview.frontPreviewsGenerated += 1;
    else pdfPreview.backPreviewsGenerated += 1;
    recordPreviewDimensions(
      pdfPreview.sampleDimensions,
      domain,
      cardname,
      job.face,
      preview
    );
  }

  return result;
}

function copyDomainIcons(config: DeckAssetConfig, warnings: string[]) {
  if (!config.iconRoot || !fs.existsSync(config.iconRoot)) {
    warnings.push(
      "No domain icon root found. Set DECK_ICON_ROOT or keep an Icons folder beside DECK_IMAGE_ROOT."
    );
    return;
  }

  for (const domain of DOMAINS) {
    const filename = `${domain}_Symbol.png`;
    const src = path.join(config.iconRoot, filename);
    const dest = path.join(config.outIconRoot, filename);

    if (!fs.existsSync(src)) {
      warnings.push(`No domain symbol icon found for ${domain}: expected ${filename}`);
      continue;
    }

    fs.copyFileSync(src, dest);
  }
}
