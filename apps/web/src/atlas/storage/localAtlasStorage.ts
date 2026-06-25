import { EMPTY_ATLAS_STATE } from "../core/cards";
import { ATLAS_CARD_TYPES, type AtlasCard, type AtlasCardType, type AtlasWorkbenchState } from "../core/types";

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
  const selectedCardId =
    typeof value.selectedCardId === "string" &&
    cards.some((card) => card.id === value.selectedCardId)
      ? value.selectedCardId
      : null;

  return { cards, selectedCardId };
}

function normalizeAtlasCard(value: unknown): AtlasCard | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const cardType = isAtlasCardType(value.type) ? value.type : null;
  if (!id || !cardType) return null;

  const rawPosition = isRecord(value.position) ? value.position : {};

  return {
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
          .map((tag) => ({
            key: typeof tag.key === "string" ? tag.key : "",
            value: typeof tag.value === "string" ? tag.value : ""
          }))
      : [],
    properties: Array.isArray(value.properties)
      ? value.properties
          .filter(isRecord)
          .map((property) => ({
            id: typeof property.id === "string" ? property.id : "",
            name: typeof property.name === "string" ? property.name : "",
            value: normalizePropertyValue(property.value)
          }))
          .filter((property) => property.id && property.name)
      : [],
    notes: typeof value.notes === "string" ? value.notes : ""
  };
}

function isAtlasCardType(value: unknown): value is AtlasCardType {
  return typeof value === "string" && ATLAS_CARD_TYPES.includes(value as AtlasCardType);
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

function numberField(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
