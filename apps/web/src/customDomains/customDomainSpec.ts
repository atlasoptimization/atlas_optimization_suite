import type { CustomCard } from "../core/types/card";
import type { CustomDomainSpec, CustomDomainSubdomain } from "../core/types/customDomain";
import { makeCustomCardId, normalizeCustomCard } from "../storage/localCustomCardsStorage";

type CustomDomainImportResult = {
  domain: CustomDomainSpec;
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function splitKeywords(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((keyword): keyword is string => typeof keyword === "string");
  }
  return stringField(value)
    .split(/[,;]+/)
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function normalizeSubdomains(value: unknown): CustomDomainSubdomain[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === "string") return { name: entry };
      if (!isRecord(entry)) return null;
      const name = stringField(entry.name);
      if (!name) return null;
      return {
        name,
        description: stringField(entry.description)
      };
    })
    .filter((entry): entry is CustomDomainSubdomain => entry !== null);
}

function normalizeEmbeddedCard(
  value: unknown,
  domainName: string,
  domainId: string
): CustomCard | null {
  const existing = normalizeCustomCard(value);
  if (existing) {
    return {
      ...existing,
      domain: existing.domain || domainName,
      raw: {
        ...existing.raw,
        customDomainId: domainId
      }
    };
  }

  if (!isRecord(value)) return null;
  const cardname = stringField(value.cardname || value.name);
  if (!cardname) return null;
  const now = new Date().toISOString();
  const backgroundImage = stringField(value.background_image || value.backgroundImage || value.imagePath);

  return {
    id: makeCustomCardId(`${domainId}-${cardname}`),
    origin: "custom",
    cardname,
    domain: stringField(value.domain, domainName),
    subdomain: stringField(value.subdomain),
    summary: stringField(value.summary),
    twin: stringField(value.scientific_twin || value.twin || value.scientificTwin),
    keywords: splitKeywords(value.keywords),
    question: stringField(value.question),
    story: stringField(value.story),
    effectGood: stringField(value.effect_good || value.effectGood || value.virtue),
    effectBad: stringField(value.effect_bad || value.effectBad || value.pathology),
    effectMod: stringField(value.effect_mod || value.effectMod || value.modifier),
    imagePath: backgroundImage || null,
    frontImage: backgroundImage || null,
    backImage: null,
    pdfPath: null,
    raw: {
      customDomainId: domainId,
      notes: stringField(value.notes)
    },
    isCustom: true,
    createdAt: now,
    updatedAt: now
  };
}

export function parseCustomDomainSpecJson(json: string): CustomDomainImportResult {
  const parsed: unknown = JSON.parse(json);
  if (!isRecord(parsed)) throw new Error("Custom domain spec must be a JSON object.");

  const schemaVersion = parsed.schemaVersion;
  if (schemaVersion !== 1) throw new Error("Unsupported custom domain schema version.");

  const domainName = stringField(parsed.domainName || parsed.name);
  if (!domainName) throw new Error("Custom domain spec requires domainName.");

  const domainId = stringField(parsed.domainId, slugify(domainName));
  const shortName = stringField(parsed.shortName, domainName.slice(0, 2));
  const subdomains = normalizeSubdomains(parsed.subdomains);
  const rawCards = Array.isArray(parsed.cards) ? parsed.cards : [];
  const warnings: string[] = [];
  const cards = rawCards
    .map((entry, index) => {
      const card = normalizeEmbeddedCard(entry, domainName, domainId);
      if (!card) warnings.push(`Skipped invalid embedded card at index ${index}.`);
      return card;
    })
    .filter((entry): entry is CustomCard => entry !== null);

  return {
    domain: {
      schemaVersion: 1,
      domainId,
      domainName,
      shortName,
      description: stringField(parsed.description),
      color: stringField(parsed.color, "#888888"),
      symbolPath: stringField(parsed.symbolPath) || undefined,
      cardsCsv: stringField(parsed.cardsCsv) || undefined,
      imagesFolder: stringField(parsed.imagesFolder) || undefined,
      domainMasterCardName: stringField(parsed.domainMasterCardName) || `The ${domainName}`,
      subdomains,
      cards,
      importedAt: new Date().toISOString()
    },
    warnings
  };
}

export function getCustomDomainCards(domains: CustomDomainSpec[]): CustomCard[] {
  return domains.flatMap((domain) => domain.cards);
}

export function getAllDomainNames(canonicalDomains: string[], customDomains: CustomDomainSpec[]) {
  return [
    ...canonicalDomains,
    ...customDomains
      .map((domain) => domain.domainName)
      .filter((domain) => !canonicalDomains.includes(domain))
  ];
}
