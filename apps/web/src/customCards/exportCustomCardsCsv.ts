import type { CustomCard } from "../core/types/card";

export const CUSTOM_CARD_CSV_COLUMNS = [
  "cardname",
  "scientific_twin",
  "domain",
  "subdomain",
  "keywords",
  "summary",
  "question",
  "story",
  "effect_good",
  "effect_bad",
  "effect_mod",
  "background_image",
  "notes"
] as const;

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function customCardsToCsv(cards: CustomCard[]): string {
  const rows = cards.map((card) => [
    card.cardname,
    card.twin,
    card.domain,
    card.subdomain,
    card.keywords.join("; "),
    card.summary,
    card.question,
    card.story,
    card.effectGood,
    card.effectBad,
    card.effectMod,
    card.imagePath ?? "",
    card.raw.notes ?? ""
  ]);

  return [
    CUSTOM_CARD_CSV_COLUMNS.join(","),
    ...rows.map((row) => row.map(csvCell).join(","))
  ].join("\n");
}

export function customCardsCsvFilename(date = new Date()) {
  return `custom-cards-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadCustomCardsCsv(cards: CustomCard[]): void {
  const blob = new Blob([customCardsToCsv(cards)], {
    type: "text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = customCardsCsvFilename();
  link.click();
  URL.revokeObjectURL(url);
}
