import type { CustomCard } from "../core/types/card";

const STORAGE_KEY = "dsd.customCardsLibrary";
const LEGACY_STORAGE_KEY = "dsd.customCards";

export type CustomCardInput = {
  cardname: string;
  domain: string;
  subdomain: string;
  summary: string;
  twin: string;
  keywords: string;
  question: string;
  story: string;
  effectGood: string;
  effectBad: string;
  effectMod: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown) {
  return typeof value === "string" ? value : "";
}

function parseKeywords(value: string) {
  return value
    .split(/[,;]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

export function makeCustomCardId(slug?: string) {
  const uuid =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const prefix = slug ? `${slug.replace(/[^a-z0-9-]+/gi, "-").replace(/(^-|-$)/g, "")}-` : "";
  return `custom:${prefix}${uuid}` as const;
}

export function createCustomCard(input: CustomCardInput): CustomCard {
  const now = new Date().toISOString();

  return {
    id: makeCustomCardId(),
    origin: "custom",
    cardname: input.cardname.trim() || "Untitled custom card",
    domain: input.domain.trim() || "Custom",
    subdomain: input.subdomain.trim(),
    summary: input.summary.trim(),
    twin: input.twin.trim(),
    keywords: parseKeywords(input.keywords),
    question: input.question.trim(),
    story: input.story.trim(),
    effectGood: input.effectGood.trim(),
    effectBad: input.effectBad.trim(),
    effectMod: input.effectMod.trim(),
    frontThumbImage: null,
    backThumbImage: null,
    imagePath: null,
    frontImage: null,
    backImage: null,
    frontReadingImage: null,
    backReadingImage: null,
    pdfPath: null,
    raw: {},
    isCustom: true,
    createdAt: now,
    updatedAt: now
  };
}

export function updateCustomCard(card: CustomCard, input: CustomCardInput): CustomCard {
  return {
    ...createCustomCard(input),
    id: card.id,
    createdAt: card.createdAt,
    updatedAt: new Date().toISOString()
  };
}

export function normalizeCustomCard(value: unknown): CustomCard | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  if (!id.startsWith("custom-") && !id.startsWith("custom:")) return null;

  return {
    id: id as CustomCard["id"],
    origin: "custom",
    cardname: stringField(value.cardname) || "Untitled custom card",
    domain: stringField(value.domain) || "Custom",
    subdomain: stringField(value.subdomain),
    summary: stringField(value.summary),
    twin: stringField(value.twin),
    keywords: Array.isArray(value.keywords)
      ? value.keywords.filter((keyword): keyword is string => typeof keyword === "string")
      : [],
    question: stringField(value.question),
    story: stringField(value.story),
    effectGood: stringField(value.effectGood),
    effectBad: stringField(value.effectBad),
    effectMod: stringField(value.effectMod),
    frontThumbImage: typeof value.frontThumbImage === "string" ? value.frontThumbImage : null,
    backThumbImage: typeof value.backThumbImage === "string" ? value.backThumbImage : null,
    imagePath: typeof value.imagePath === "string" ? value.imagePath : null,
    frontImage: typeof value.frontImage === "string" ? value.frontImage : null,
    backImage: typeof value.backImage === "string" ? value.backImage : null,
    frontReadingImage: typeof value.frontReadingImage === "string" ? value.frontReadingImage : null,
    backReadingImage: typeof value.backReadingImage === "string" ? value.backReadingImage : null,
    pdfPath: typeof value.pdfPath === "string" ? value.pdfPath : null,
    raw: isRecord(value.raw) ? Object.fromEntries(
      Object.entries(value.raw).filter((entry): entry is [string, string] => typeof entry[1] === "string")
    ) : {},
    isCustom: true,
    createdAt: stringField(value.createdAt) || new Date().toISOString(),
    updatedAt: stringField(value.updatedAt) || new Date().toISOString()
  };
}

export function loadCustomCards(): CustomCard[] {
  const rawValues = [localStorage.getItem(STORAGE_KEY), localStorage.getItem(LEGACY_STORAGE_KEY)]
    .filter((value): value is string => typeof value === "string");
  if (rawValues.length === 0) return [];

  const byId = new Map<string, CustomCard>();

  for (const raw of rawValues) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;

      for (const card of parsed
        .map((entry) => normalizeCustomCard(entry))
        .filter((entry): entry is CustomCard => entry !== null)) {
        byId.set(card.id, card);
      }
    } catch {
      continue;
    }
  }

  return [...byId.values()];
}

export function saveCustomCards(cards: CustomCard[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}
