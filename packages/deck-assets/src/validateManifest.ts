import fs from "node:fs";
import path from "node:path";
import {
  ART_IMAGE_FIELD_NAMES,
  buildExpectedPdfFilename,
  findBestAsset,
  findBestPdfAsset,
  resolveCsvArtAsset
} from "./assetMatching";
import { parseCsv } from "./csv";
import { DOMAINS } from "./domains";
import { getField } from "./fields";
import { firstCsvInDomain, listFilesRecursive } from "./files";
import { slugify } from "./slugify";
import type {
  AssetValidationIssue,
  AssetValidationReport,
  CsvRow,
  DeckAssetConfig
} from "./types";

const cardNameFields = ["cardname", "card_name", "Card Name", "name", "Name", "title", "Title"];
const knownColumnNames = new Set(
  [
    ...cardNameFields,
    "subdomain",
    "Subdomain",
    "summary",
    "Summary",
    "twin",
    "scientific_twin",
    "Scientific Twin",
    "scientific twin",
    "keywords",
    "keyword",
    "tags",
    "question",
    "Question",
    "story",
    "Story",
    "effect_good",
    "effectGood",
    "virtue",
    "good",
    "effect_bad",
    "effectBad",
    "pathology",
    "bad",
    "effect_mod",
    "effectMod",
    "modifier",
    "mod",
    "nr",
    "Nr",
    "number",
    "Number",
    "card_number",
    "Card Number",
    ...ART_IMAGE_FIELD_NAMES
  ].map(slugify)
);

const requiredFields: { label: string; names: string[] }[] = [
  { label: "summary", names: ["summary", "Summary"] },
  { label: "twin", names: ["twin", "scientific_twin", "Scientific Twin", "scientific twin"] },
  { label: "question", names: ["question", "Question"] },
  { label: "effectGood", names: ["effect_good", "effectGood", "virtue", "good"] },
  { label: "effectBad", names: ["effect_bad", "effectBad", "pathology", "bad"] },
  { label: "effectMod", names: ["effect_mod", "effectMod", "modifier", "mod"] }
];

function issue(
  severity: AssetValidationIssue["severity"],
  message: string,
  domain?: string,
  cardname?: string
): AssetValidationIssue {
  return { severity, message, domain, cardname };
}

function isSuspiciousEmptyRow(row: CsvRow) {
  const values = Object.values(row).map((value) => String(value ?? "").trim());
  return values.length === 0 || values.every((value) => value === "");
}

function addCount(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function findDuplicates(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) addCount(counts, value);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function findUnknownColumns(row: CsvRow) {
  return Object.keys(row).filter((column) => !knownColumnNames.has(slugify(column)));
}

export function validateManifestFromLocalAssets(config: DeckAssetConfig): AssetValidationReport {
  const warnings: AssetValidationIssue[] = [];
  const errors: AssetValidationIssue[] = [];
  const countsByDomain: Record<string, number> = Object.fromEntries(
    DOMAINS.map((domain) => [domain, 0])
  );
  const ids: string[] = [];
  const cardNames: string[] = [];
  let missingImageCount = 0;
  let missingPdfCount = 0;
  let missingRequiredFieldCount = 0;

  if (!fs.existsSync(config.csvRoot)) {
    errors.push(issue("error", "CSV root does not exist."));
    return {
      cardCount: 0,
      countsByDomain,
      missingImageCount,
      missingPdfCount,
      missingRequiredFieldCount,
      warnings,
      errors,
      duplicateIds: [],
      duplicateCardNames: []
    };
  }

  for (const domain of DOMAINS) {
    const csvFile = firstCsvInDomain(config.csvRoot, domain);

    if (!csvFile) {
      warnings.push(issue("warning", `No CSV found for domain ${domain}`, domain));
      continue;
    }

    const imageFiles = listFilesRecursive(path.join(config.imageRoot, domain));
    const pdfFiles = listFilesRecursive(path.join(config.pdfRoot, domain));
    const rows = parseCsv(csvFile);
    const reportedUnknownColumns = new Set<string>();

    rows.forEach((row, rowIndex) => {
      if (isSuspiciousEmptyRow(row)) {
        warnings.push(issue("warning", `Suspicious empty row ${rowIndex + 2}`, domain));
        return;
      }

      for (const column of findUnknownColumns(row)) {
        if (reportedUnknownColumns.has(column)) continue;
        reportedUnknownColumns.add(column);
        warnings.push(issue("warning", `Unknown column "${column}"`, domain));
      }

      const cardname = getField(row, cardNameFields);

      if (!cardname) {
        warnings.push(issue("warning", `Row ${rowIndex + 2} is missing cardname`, domain));
        return;
      }

      const id = `${slugify(domain)}-${slugify(cardname)}`;
      ids.push(id);
      cardNames.push(cardname.trim().toLowerCase());
      countsByDomain[domain] += 1;

      for (const field of requiredFields) {
        const value = getField(row, field.names);
        const hasAspectFallback = domain === "Aspect" && field.label === "effectMod";
        if (!value && !hasAspectFallback) {
          missingRequiredFieldCount += 1;
          warnings.push(
            issue("warning", `Missing required semantic field ${field.label}`, domain, cardname)
          );
        }
      }

      const artReference = getField(row, ART_IMAGE_FIELD_NAMES, "");
      const explicitImage = resolveCsvArtAsset({
        artReference,
        files: imageFiles,
        searchRoots: [
          path.join(config.imageRoot, domain),
          config.imageRoot,
          path.dirname(csvFile)
        ],
        exts: [".png", ".jpg", ".jpeg", ".webp"]
      });
      const image = explicitImage ?? findBestAsset(imageFiles, cardname, [".png", ".jpg", ".jpeg", ".webp"]);
      const nr = getField(row, ["nr", "Nr", "number", "Number", "card_number", "Card Number"]);
      const pdf = findBestPdfAsset(pdfFiles, domain, nr, cardname);

      if (artReference && !explicitImage) {
        warnings.push(issue("warning", `CSV art image not found: ${artReference}`, domain, cardname));
      }

      if (!image) {
        missingImageCount += 1;
        warnings.push(issue("warning", "No image match found", domain, cardname));
      }

      if (!pdf) {
        missingPdfCount += 1;
        const expected = nr ? buildExpectedPdfFilename(domain, nr, cardname) : "missing row number";
        warnings.push(
          issue(
            "warning",
            `No PDF match found for nr=${nr || "missing"}. Expected something like ${expected}`,
            domain,
            cardname
          )
        );
      }
    });
  }

  const duplicateIds = findDuplicates(ids);
  const duplicateCardNames = findDuplicates(cardNames);

  for (const id of duplicateIds) {
    errors.push(issue("error", `Duplicate card ID ${id}`));
  }

  for (const cardname of duplicateCardNames) {
    warnings.push(issue("warning", `Duplicate card name ${cardname}`));
  }

  if (ids.length === 0) {
    errors.push(issue("error", "No cards found."));
  }

  return {
    cardCount: ids.length,
    countsByDomain,
    missingImageCount,
    missingPdfCount,
    missingRequiredFieldCount,
    warnings,
    errors,
    duplicateIds,
    duplicateCardNames
  };
}
