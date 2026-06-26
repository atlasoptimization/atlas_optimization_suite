import { normalizeAtlasState } from "../storage/localAtlasStorage";
import type { AtlasCard, AtlasCardQuery, AtlasGroup, AtlasWorkbenchState } from "./types";

export const ATLAS_IR_SCHEMA_VERSION = "0.1";

export type AtlasIRMetadata = {
  source: "atlas-gui";
  exportedAt: string;
};

export type AtlasIR = {
  schemaVersion: typeof ATLAS_IR_SCHEMA_VERSION;
  metadata: AtlasIRMetadata;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  groups: AtlasGroup[];
};

export type AtlasIRImportResult = {
  state: AtlasWorkbenchState;
  diagnostics: string[];
};

export function exportAtlasIR(
  state: AtlasWorkbenchState,
  metadata: Partial<AtlasIRMetadata> = {}
): AtlasIR {
  return {
    schemaVersion: ATLAS_IR_SCHEMA_VERSION,
    metadata: {
      source: "atlas-gui",
      exportedAt: metadata.exportedAt ?? new Date().toISOString()
    },
    cards: state.cards.map(copyCardForIR),
    queries: state.queries.map((query) => ({
      ...query,
      includeTags: query.includeTags.map((condition) => ({ ...condition })),
      excludeTags: query.excludeTags.map((condition) => ({ ...condition }))
    })),
    groups: state.groups.map((group) => ({
      ...group,
      position: { ...group.position },
      size: { ...group.size }
    }))
  };
}

export function serializeAtlasIR(ir: AtlasIR) {
  return JSON.stringify(ir, null, 2);
}

export function importAtlasIR(value: unknown): AtlasIRImportResult {
  const diagnostics = validateAtlasIR(value);
  if (diagnostics.length > 0) {
    return { state: normalizeAtlasState({ cards: [] }), diagnostics };
  }

  const ir = value as AtlasIR;
  return {
    state: normalizeAtlasState({
      cards: ir.cards,
      queries: ir.queries,
      groups: ir.groups,
      selectedCardId: null,
      selectedGroupId: null,
      selectedQueryId: null
    }),
    diagnostics: []
  };
}

export function validateAtlasIR(value: unknown): string[] {
  const diagnostics: string[] = [];
  if (!isRecord(value)) return ["Atlas IR must be a JSON object."];
  if (value.schemaVersion !== ATLAS_IR_SCHEMA_VERSION) {
    diagnostics.push(`Unsupported Atlas IR schemaVersion "${String(value.schemaVersion)}".`);
  }
  if (!Array.isArray(value.cards)) diagnostics.push("Atlas IR cards must be an array.");
  if (!Array.isArray(value.queries)) diagnostics.push("Atlas IR queries must be an array.");
  if (!Array.isArray(value.groups)) diagnostics.push("Atlas IR groups must be an array.");

  if (Array.isArray(value.cards)) {
    for (const [index, card] of value.cards.entries()) {
      if (!isRecord(card) || typeof card.id !== "string" || !card.id.trim()) {
        diagnostics.push(`Card at index ${index} is missing required id.`);
      }
      if (!isRecord(card) || typeof card.type !== "string" || !card.type.trim()) {
        diagnostics.push(`Card at index ${index} is missing required type.`);
      }
    }
  }

  return diagnostics;
}

function copyCardForIR(card: AtlasCard): AtlasCard {
  return {
    ...card,
    position: { ...card.position },
    tags: card.tags.map((tag) => ({ ...tag })),
    properties: card.properties.map((property) => ({ ...property })),
    ...(card.taggedSum ? { taggedSum: copyJson(card.taggedSum) } : {}),
    ...(card.objective ? { objective: copyJson(card.objective) } : {}),
    ...(card.constraint ? { constraint: copyJson(card.constraint) } : {})
  };
}

function copyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
