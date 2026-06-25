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
import { getField } from "./fields";
import { ensureDir, listFilesRecursive } from "./files";
import {
  browserPathForPublicDeckFile,
  type PdfRenderer,
  renderPdfPageToPng
} from "./pdfPreview";
import { slugify } from "./slugify";
import type { DeckAssetConfig, ManifestCard, PdfPreviewSummary } from "./types";

export type CustomDomainMetadata = {
  domainName: string;
  domainFolderName: string;
  domainOutputName: string;
  dataCsvName: string;
  generateScriptName: string;
  templateSlaName: string;
  raw: Record<string, string>;
};

export type CustomDomainBuildSummary = {
  domainsFound: number;
  cardsLoaded: number;
  details: string[];
  ignoredFolders: string[];
  warnings: string[];
  cards: ManifestCard[];
};

const IGNORED_CUSTOM_DOMAIN_DIRS = new Set(["scribus_generator", "__pycache__"]);

export function parseDomainMetadataFile(file: string): CustomDomainMetadata {
  const text = fs.readFileSync(file, "utf8");
  const raw: Record<string, string> = {};

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^:=\s]+)\s*[:=]\s*(.*)$/);
    if (!match) continue;
    raw[match[1].trim()] = unquote(match[2].trim());
  }

  const domainName = raw.domain_name || raw.domainName || raw.name || "";
  const domainFolderName = raw.domain_folder_name || raw.domainFolderName || "";
  const dataCsvName = raw.data_csv_name || raw.dataCsvName || raw.csv || "";

  if (!domainName) throw new Error(`Missing domain_name in ${file}`);
  if (!dataCsvName) throw new Error(`Missing data_csv_name in ${file}`);

  return {
    domainName,
    domainFolderName,
    domainOutputName: raw.domain_output_name || raw.domainOutputName || "output",
    dataCsvName,
    generateScriptName: raw.generate_script_name || raw.generateScriptName || "generate_cards_custom.sh",
    templateSlaName: raw.template_sla_name || raw.templateSlaName || "",
    raw
  };
}

export function scanCustomDomainCards(
  config: DeckAssetConfig,
  pdfRenderer: PdfRenderer | null,
  pdfPreview: PdfPreviewSummary
): CustomDomainBuildSummary {
  const warnings: string[] = [];
  const cards: ManifestCard[] = [];
  const details: string[] = [];

  if (!fs.existsSync(config.customDomainsRoot)) {
    return { domainsFound: 0, cardsLoaded: 0, details, ignoredFolders: [], warnings, cards };
  }

  const entries = fs
    .readdirSync(config.customDomainsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const ignoredFolders = entries
    .filter((entry) => IGNORED_CUSTOM_DOMAIN_DIRS.has(entry.name))
    .map((entry) => entry.name);
  const domainDirs = entries
    .filter((entry) => !IGNORED_CUSTOM_DOMAIN_DIRS.has(entry.name))
    .map((entry) => path.join(config.customDomainsRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "templates", "domain_metadata.txt")));

  for (const domainDir of domainDirs) {
    try {
      const domainCards = loadCustomDomainCards(config, domainDir, pdfRenderer, pdfPreview, warnings);
      cards.push(...domainCards);
      const pdfCount = domainCards.filter((card) => Boolean(card.pdfPath)).length;
      const previewCount = domainCards.filter((card) => Boolean(card.frontImage)).length +
        domainCards.filter((card) => Boolean(card.backImage)).length;
      details.push(
        `${path.basename(domainDir)}: ${domainCards.length} cards, ${pdfCount} PDFs matched, ${previewCount} previews available`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(`Custom domain skipped ${path.basename(domainDir)}: ${message}`);
    }
  }

  return {
    domainsFound: domainDirs.length,
    cardsLoaded: cards.length,
    details,
    ignoredFolders,
    warnings,
    cards
  };
}

function loadCustomDomainCards(
  config: DeckAssetConfig,
  domainDir: string,
  pdfRenderer: PdfRenderer | null,
  pdfPreview: PdfPreviewSummary,
  warnings: string[]
) {
  const metadataFile = path.join(domainDir, "templates", "domain_metadata.txt");
  const metadata = parseDomainMetadataFile(metadataFile);
  const domainName = titleCase(metadata.domainName);
  const domainSlug = slugify(metadata.domainFolderName || metadata.domainName || path.basename(domainDir));
  const csvFile = path.join(domainDir, "templates", metadata.dataCsvName);
  const outputDir = path.join(domainDir, "output");
  const imageFiles = listFilesRecursive(path.join(domainDir, "card_graphics"));
  const pdfFiles = listFilesRecursive(outputDir);

  if (!fs.existsSync(csvFile)) throw new Error(`CSV not found: templates/${metadata.dataCsvName}`);

  const rows = parseCsv(csvFile);
  const cards: ManifestCard[] = [];

  for (const row of rows) {
    const cardname = getField(row, ["cardname", "card_name", "name", "title"]);
    if (!cardname) {
      warnings.push(`Skipped custom-domain row without cardname in ${csvFile}`);
      continue;
    }

    const nr = getField(row, ["nr", "number", "card_number"]);
    const cardSlug = nr ? `${String(nr).trim()}-${slugify(cardname)}` : slugify(cardname);
    const id = `custom:${domainSlug}:${cardSlug}`;
    const domain = titleCase(getField(row, ["domain"], domainName));
    const art = getField(row, ART_IMAGE_FIELD_NAMES, "");
    const explicitImage = resolveCsvArtAsset({
      artReference: art,
      files: imageFiles,
      searchRoots: [
        path.join(domainDir, "card_graphics"),
        path.join(domainDir, "background"),
        path.dirname(csvFile)
      ],
      exts: [".png", ".jpg", ".jpeg", ".webp"]
    });
    const image = explicitImage
      ? explicitImage
      : findBestAsset(imageFiles, cardname, [".png", ".jpg", ".jpeg", ".webp"]);
    const pdf = config.includePdfs === false ? null : findBestPdfAsset(pdfFiles, domain, nr, cardname);

    const imagePath = copyAsset(
      image,
      path.join(config.outRoot, "custom-domains", domainSlug, "images"),
      cardSlug,
      config.outRoot
    );
    const pdfPath =
      config.includePdfs === false
        ? null
        : copyAsset(
            pdf,
            path.join(config.outRoot, "custom-domains", domainSlug, "pdfs"),
            cardSlug,
            config.outRoot
          );

    let frontImage: string | null = null;
    let backImage: string | null = null;

    if (pdf && config.includePreviews !== false) {
      pdfPreview.pdfsMatched += 1;
      if (pdfRenderer) {
        const previewDir = path.join(config.outRoot, "custom-domains", domainSlug, "pdf-previews");
        ensureDir(previewDir);
        const frontPreviewPath = path.join(previewDir, `${cardSlug}_front.png`);
        const backPreviewPath = path.join(previewDir, `${cardSlug}_back.png`);
        const frontPreview = renderPdfPageToPng(pdfRenderer, pdf, 1, frontPreviewPath, config.pdfPreviewDpi);
        if (frontPreview.ok) {
          frontImage = browserPathForPublicDeckFile(config.outRoot, frontPreviewPath);
          pdfPreview.frontPreviewsGenerated += 1;
        } else {
          warnings.push(`Custom PDF front preview failed for ${domain} / ${cardname}`);
          pdfPreview.previewsSkipped += 1;
        }
        const backPreview = renderPdfPageToPng(pdfRenderer, pdf, 2, backPreviewPath, config.pdfPreviewDpi);
        if (backPreview.ok) {
          backImage = browserPathForPublicDeckFile(config.outRoot, backPreviewPath);
          pdfPreview.backPreviewsGenerated += 1;
        } else {
          warnings.push(`Custom PDF back preview failed for ${domain} / ${cardname}`);
          pdfPreview.previewsSkipped += 1;
        }
      } else {
        pdfPreview.previewsSkipped += 2;
      }
    } else if (config.includePdfs !== false) {
      const expected = nr ? buildExpectedPdfFilename(domain, nr, cardname) : "missing row number";
      warnings.push(`No custom-domain PDF matched for ${domain} / nr=${nr || "missing"} / ${cardname}. Expected something like ${expected}`);
    }

    const keywordsRaw = getField(row, ["keywords", "keyword", "tags"], "");
    cards.push({
      id,
      origin: "custom-domain",
      customDomainId: domainSlug,
      cardname,
      domain,
      subdomain: getField(row, ["subdomain", "Subdomain"], ""),
      summary: getField(row, ["summary", "Summary"], ""),
      twin: getField(row, ["twin", "scientific_twin", "Scientific Twin", "scientific twin"], ""),
      keywords: keywordsRaw.split(/[,;]+/).map((keyword) => keyword.trim()).filter(Boolean),
      question: getField(row, ["question", "Question"], ""),
      story: getField(row, ["story", "Story"], ""),
      effectGood: getField(row, ["effect_good", "effectGood", "virtue", "good"], ""),
      effectBad: getField(row, ["effect_bad", "effectBad", "pathology", "bad"], ""),
      effectMod: getField(row, ["effect_mod", "effectMod", "modifier", "mod"], ""),
      frontImage,
      backImage,
      imagePath,
      pdfPath,
      raw: {
        ...row,
        customDomainId: domainSlug,
        customDomainFolder: path.basename(domainDir)
      }
    });
  }

  console.log(`Loaded ${cards.length} custom-domain rows from ${path.basename(domainDir)}: ${csvFile}`);
  return cards;
}

function unquote(value: string) {
  return value.replace(/^["']|["']$/g, "");
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}
