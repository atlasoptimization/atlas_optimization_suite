import type {
  AtlasCard,
  AtlasCardType,
  AtlasPosition,
  AtlasProperty,
  AtlasPropertyKind,
  AtlasTag,
  AtlasWorkbenchState
} from "./types";
import { createTaggedSumConfig } from "./functions";
import { getAtlasCardTemplate } from "./templates";

export const EMPTY_ATLAS_STATE: AtlasWorkbenchState = {
  cards: [],
  groups: [],
  queries: [],
  selectedCardId: null,
  selectedGroupId: null,
  selectedQueryId: null
};

const DEFAULT_CARD_TITLES: Record<AtlasCardType, string> = {
  object: "Object",
  decision: "Decision",
  data: "Data",
  function: "Function",
  constraint: "Constraint",
  objective: "Objective"
};

export function createAtlasCard(
  cardType: AtlasCardType,
  options: { id?: string; index?: number; position?: AtlasPosition } = {}
): AtlasCard {
  const index = options.index ?? 0;
  const functionDefaults =
    cardType === "function"
      ? {
          functionKind: "tagged_sum" as const,
          taggedSum: createTaggedSumConfig()
        }
      : {};

  return {
    id: options.id ?? makeAtlasId("card"),
    type: cardType,
    ...functionDefaults,
    title: DEFAULT_CARD_TITLES[cardType],
    position: options.position ?? {
      x: 760 + (index % 4) * 260,
      y: 660 + Math.floor(index / 4) * 180
    },
    tags: [],
    properties: [],
    notes: ""
  };
}

export function addAtlasCard(
  state: AtlasWorkbenchState,
  cardType: AtlasCardType,
  id?: string
): AtlasWorkbenchState {
  const card = createAtlasCard(cardType, { id, index: state.cards.length });

  return {
    ...state,
    cards: [...state.cards, card],
    selectedCardId: card.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function addAtlasCardFromTemplate(
  state: AtlasWorkbenchState,
  templateId: string
): AtlasWorkbenchState {
  const template = getAtlasCardTemplate(templateId);
  if (!template) return state;

  const card = createAtlasCard(template.cardType, { index: state.cards.length });
  const templatedCard: AtlasCard = {
    ...card,
    title: template.name,
    tags: template.defaultTags.map((tag) => createAtlasTag(tag.key, tag.value)),
    properties: template.defaultProperties.map((property) =>
      createAtlasProperty(property.name, property.kind, property.value, {
        unit: property.unit,
        notes: property.notes
      })
    )
  };

  return {
    ...state,
    cards: [...state.cards, templatedCard],
    selectedCardId: templatedCard.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function moveAtlasCard(
  state: AtlasWorkbenchState,
  cardId: string,
  position: AtlasPosition
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, position } : card
    )
  };
}

export function deleteAtlasCard(state: AtlasWorkbenchState, cardId: string): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.filter((card) => card.id !== cardId),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId
  };
}

export function getSelectedAtlasCard(state: AtlasWorkbenchState) {
  return state.cards.find((card) => card.id === state.selectedCardId) ?? null;
}

export function createAtlasTag(key: string, value: string, id = makeAtlasId("tag")): AtlasTag {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new Error("Tag key is required.");

  return {
    id,
    key: trimmedKey,
    value: value.trim()
  };
}

export function addAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  key: string,
  value: string,
  id?: string
): AtlasWorkbenchState {
  const tag = createAtlasTag(key, value, id);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, tags: [...card.tags, tag] } : card
    )
  };
}

export function updateAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  tagId: string,
  key: string,
  value: string
): AtlasWorkbenchState {
  const nextTag = createAtlasTag(key, value, tagId);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            tags: card.tags.map((tag) => (tag.id === tagId ? nextTag : tag))
          }
        : card
    )
  };
}

export function deleteAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  tagId: string
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, tags: card.tags.filter((tag) => tag.id !== tagId) }
        : card
    )
  };
}

export function createAtlasProperty(
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { id?: string; unit?: string; notes?: string } = {}
): AtlasProperty {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Property name is required.");
  const unit = optionalText(options.unit);
  const notes = optionalText(options.notes);

  return {
    id: options.id ?? makeAtlasId("prop"),
    name: trimmedName,
    kind,
    value,
    ...(unit ? { unit } : {}),
    ...(notes ? { notes } : {})
  };
}

export function addAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { id?: string; unit?: string; notes?: string } = {}
): AtlasWorkbenchState {
  const property = createAtlasProperty(name, kind, value, options);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, properties: [...card.properties, property] }
        : card
    )
  };
}

export function updateAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  propertyId: string,
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { unit?: string; notes?: string } = {}
): AtlasWorkbenchState {
  const nextProperty = createAtlasProperty(name, kind, value, {
    ...options,
    id: propertyId
  });

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            properties: card.properties.map((property) =>
              property.id === propertyId ? nextProperty : property
            )
          }
        : card
    )
  };
}

export function deleteAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  propertyId: string
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            properties: card.properties.filter((property) => property.id !== propertyId)
          }
        : card
    )
  };
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function makeAtlasId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
