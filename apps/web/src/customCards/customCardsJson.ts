import type { CustomCard } from "../core/types/card";
import {
  makeCustomCardId,
  normalizeCustomCard
} from "../storage/localCustomCardsStorage";

export type CustomCardsExportJson = {
  schemaVersion: 1;
  exportedAt: string;
  app: "data-science-deck-app";
  customCards: CustomCard[];
};

export type CustomCardsJsonImportResult = {
  cards: CustomCard[];
  imported: number;
  skipped: number;
  warnings: string[];
};

export function createCustomCardsExport(cards: CustomCard[]): CustomCardsExportJson {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "data-science-deck-app",
    customCards: cards
  };
}

export function createCustomCardsExportJson(cards: CustomCard[]): string {
  return JSON.stringify(createCustomCardsExport(cards), null, 2);
}

export function downloadCustomCardsJson(cards: CustomCard[]): void {
  const blob = new Blob([createCustomCardsExportJson(cards)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `custom-cards-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseCustomCardsJson(
  json: string,
  existingCardIds: Iterable<string> = []
): CustomCardsJsonImportResult {
  const parsed: unknown = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Custom card import must be a JSON object.");
  }

  const record = parsed as Record<string, unknown>;
  if (record.app !== "data-science-deck-app" || record.schemaVersion !== 1) {
    throw new Error("Unsupported custom cards JSON file.");
  }

  if (!Array.isArray(record.customCards)) {
    throw new Error("Custom cards JSON must contain a customCards array.");
  }

  const existing = new Set(existingCardIds);
  const warnings: string[] = [];
  const cards: CustomCard[] = [];
  let skipped = 0;

  for (const entry of record.customCards) {
    const card = normalizeCustomCard(entry);
    if (!card) {
      skipped += 1;
      warnings.push("Skipped an invalid custom card entry.");
      continue;
    }

    if (existing.has(card.id) || cards.some((candidate) => candidate.id === card.id)) {
      cards.push({
        ...card,
        id: makeCustomCardId(card.cardname)
      });
    } else {
      cards.push(card);
    }
    existing.add(cards[cards.length - 1].id);
  }

  return {
    cards,
    imported: cards.length,
    skipped,
    warnings
  };
}
