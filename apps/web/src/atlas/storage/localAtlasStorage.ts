import { EMPTY_ATLAS_STATE } from "../core/cards";
import {
  ATLAS_CARD_TYPES,
  ATLAS_FUNCTION_KINDS,
  ATLAS_PROPERTY_KINDS,
  type AtlasCard,
  type AtlasCardType,
  type AtlasCardQuery,
  type AtlasExpression,
  type AtlasFunctionKind,
  type AtlasGroup,
  type AtlasPropertyKind,
  type AtlasWorkbenchState
} from "../core/types";
import { createTaggedSumConfig } from "../core/functions";

const STORAGE_KEY = "atlas.optimization.workbench.v0";

export function loadAtlasWorkbenchState(): AtlasWorkbenchState {
  if (typeof localStorage === "undefined") return EMPTY_ATLAS_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ATLAS_STATE;
    return normalizeAtlasState(JSON.parse(raw));
  } catch {
    return EMPTY_ATLAS_STATE;
  }
}

export function saveAtlasWorkbenchState(state: AtlasWorkbenchState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeAtlasState(value: unknown): AtlasWorkbenchState {
  if (!isRecord(value) || !Array.isArray(value.cards)) return EMPTY_ATLAS_STATE;

  const cards = value.cards
    .map(normalizeAtlasCard)
    .filter((card): card is AtlasCard => card !== null);
  const groups = Array.isArray(value.groups)
    ? value.groups
        .map(normalizeAtlasGroup)
        .filter((group): group is AtlasGroup => group !== null)
    : [];
  const queries = Array.isArray(value.queries)
    ? value.queries
        .map(normalizeAtlasQuery)
        .filter((query): query is AtlasCardQuery => query !== null)
    : [];
  const selectedCardId =
    typeof value.selectedCardId === "string" &&
    cards.some((card) => card.id === value.selectedCardId)
      ? value.selectedCardId
      : null;
  const selectedGroupId =
    selectedCardId === null &&
    typeof value.selectedGroupId === "string" &&
    groups.some((group) => group.id === value.selectedGroupId)
      ? value.selectedGroupId
      : null;
  const selectedQueryId =
    selectedCardId === null &&
    selectedGroupId === null &&
    typeof value.selectedQueryId === "string" &&
    queries.some((query) => query.id === value.selectedQueryId)
      ? value.selectedQueryId
      : null;

  return { cards, groups, queries, selectedCardId, selectedGroupId, selectedQueryId };
}

function normalizeAtlasCard(value: unknown): AtlasCard | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const cardType = isAtlasCardType(value.type) ? value.type : null;
  if (!id || !cardType) return null;

  const rawPosition = isRecord(value.position) ? value.position : {};

  const baseCard: AtlasCard = {
    id,
    type: cardType,
    title: typeof value.title === "string" ? value.title : cardType,
    position: {
      x: numberField(rawPosition.x),
      y: numberField(rawPosition.y)
    },
    tags: Array.isArray(value.tags)
      ? value.tags
          .filter(isRecord)
          .map((tag, index) => ({
            id: typeof tag.id === "string" ? tag.id : `tag_${id}_${index}`,
            key: typeof tag.key === "string" ? tag.key : "",
            value: typeof tag.value === "string" ? tag.value : ""
          }))
          .filter((tag) => tag.key.trim())
      : [],
    properties: Array.isArray(value.properties)
      ? value.properties
          .filter(isRecord)
          .map((property, index) => ({
            id: typeof property.id === "string" ? property.id : `prop_${id}_${index}`,
            name: typeof property.name === "string" ? property.name : "",
            kind: isAtlasPropertyKind(property.kind) ? property.kind : "constant",
            value: normalizePropertyValue(property.value),
            unit: typeof property.unit === "string" && property.unit.trim()
              ? property.unit.trim()
              : undefined,
            notes: typeof property.notes === "string" && property.notes.trim()
              ? property.notes.trim()
              : undefined
          }))
          .filter((property) => property.name.trim())
      : [],
    notes: typeof value.notes === "string" ? value.notes : ""
  };

  if (cardType !== "function") return baseCard;

  const functionKind = isAtlasFunctionKind(value.functionKind) ? value.functionKind : "tagged_sum";
  const taggedSum = isRecord(value.taggedSum)
    ? createTaggedSumConfig({
        queryId: typeof value.taggedSum.queryId === "string" ? value.taggedSum.queryId : null,
        expression: normalizeAtlasExpression(value.taggedSum.expression),
        displayName:
          typeof value.taggedSum.displayName === "string"
            ? value.taggedSum.displayName
            : "TaggedSum",
        description:
          typeof value.taggedSum.description === "string"
            ? value.taggedSum.description
            : undefined
      })
    : createTaggedSumConfig();

  return {
    ...baseCard,
    functionKind,
    taggedSum
  };
}

function normalizeAtlasGroup(value: unknown): AtlasGroup | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) return null;

  const rawPosition = isRecord(value.position) ? value.position : {};
  const rawSize = isRecord(value.size) ? value.size : {};

  return {
    id,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Group",
    position: {
      x: numberField(rawPosition.x),
      y: numberField(rawPosition.y)
    },
    size: {
      width: Math.max(180, numberField(rawSize.width, 720)),
      height: Math.max(120, numberField(rawSize.height, 420))
    },
    color: typeof value.color === "string" && value.color.trim() ? value.color.trim() : undefined,
    notes: typeof value.notes === "string" ? value.notes : ""
  };
}

function normalizeAtlasQuery(value: unknown): AtlasCardQuery | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) return null;

  return {
    id,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Query",
    includeTags: normalizeConditions(value.includeTags, id, "include"),
    excludeTags: normalizeConditions(value.excludeTags, id, "exclude")
  };
}

function normalizeConditions(value: unknown, queryId: string, prefix: string) {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((condition, index) => ({
          id: typeof condition.id === "string" ? condition.id : `${prefix}_${queryId}_${index}`,
          key: typeof condition.key === "string" ? condition.key : "",
          value: typeof condition.value === "string" ? condition.value : ""
        }))
    : [];
}

function isAtlasCardType(value: unknown): value is AtlasCardType {
  return typeof value === "string" && ATLAS_CARD_TYPES.includes(value as AtlasCardType);
}

function isAtlasPropertyKind(value: unknown): value is AtlasPropertyKind {
  return typeof value === "string" && ATLAS_PROPERTY_KINDS.includes(value as AtlasPropertyKind);
}

function isAtlasFunctionKind(value: unknown): value is AtlasFunctionKind {
  return typeof value === "string" && ATLAS_FUNCTION_KINDS.includes(value as AtlasFunctionKind);
}

function normalizeAtlasExpression(value: unknown): AtlasExpression | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "literal") {
    return typeof value.value === "string" || typeof value.value === "number"
      ? { kind: "literal", value: value.value }
      : null;
  }

  if (value.kind === "property_ref") {
    return typeof value.queryId === "string" && typeof value.propertyName === "string"
      ? {
          kind: "property_ref",
          queryId: value.queryId,
          propertyName: value.propertyName
        }
      : null;
  }

  if (value.kind === "multiply") {
    const left = normalizeAtlasExpression(value.left);
    const right = normalizeAtlasExpression(value.right);
    return left && right ? { kind: "multiply", left, right } : null;
  }

  if (value.kind === "add" && Array.isArray(value.terms)) {
    const terms = value.terms
      .map(normalizeAtlasExpression)
      .filter((term): term is AtlasExpression => term !== null);
    return { kind: "add", terms };
  }

  return null;
}

function normalizePropertyValue(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }

  return null;
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
