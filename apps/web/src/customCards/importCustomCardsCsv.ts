import type { CustomCard } from "../core/types/card";
import { makeCustomCardId } from "../storage/localCustomCardsStorage";

export type CustomCardsCsvImportResult = {
  cards: CustomCard[];
  imported: number;
  skipped: number;
  warnings: string[];
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

function splitKeywords(value: string) {
  return value
    .split(/[,;]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function field(row: Record<string, string>, ...names: string[]) {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

export function parseCustomCardsCsv(text: string): CustomCardsCsvImportResult {
  const rows = parseCsv(text);
  const warnings: string[] = [];

  if (rows.length === 0) {
    return { cards: [], imported: 0, skipped: 0, warnings: ["CSV file was empty."] };
  }

  const headers = rows[0].map(normalizeHeader);
  const cards: CustomCard[] = [];
  let skipped = 0;

  rows.slice(1).forEach((cells, rowIndex) => {
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    const cardname = field(row, "cardname", "name", "card_name");

    if (!cardname) {
      skipped += 1;
      warnings.push(`Skipped row ${rowIndex + 2}: missing cardname.`);
      return;
    }

    const now = new Date().toISOString();
    const backgroundImage = field(row, "background_image", "imagePath", "image_path");
    cards.push({
      id: makeCustomCardId(slugify(cardname)),
      origin: "custom",
      cardname,
      domain: field(row, "domain", "category") || "Custom",
      subdomain: field(row, "subdomain", "sub_domain"),
      summary: field(row, "summary"),
      twin: field(row, "scientific_twin", "twin", "scientificTwin"),
      keywords: splitKeywords(field(row, "keywords")),
      question: field(row, "question"),
      story: field(row, "story", "flavor", "flavour"),
      effectGood: field(row, "effect_good", "effectGood", "virtue"),
      effectBad: field(row, "effect_bad", "effectBad", "pathology"),
      effectMod: field(row, "effect_mod", "effectMod", "modifier"),
      imagePath: backgroundImage || null,
      frontImage: backgroundImage || null,
      backImage: null,
      pdfPath: null,
      raw: {
        notes: field(row, "notes")
      },
      isCustom: true,
      createdAt: now,
      updatedAt: now
    });
  });

  return {
    cards,
    imported: cards.length,
    skipped,
    warnings
  };
}
