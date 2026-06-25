import type { AtlasCard, AtlasCardType, AtlasPosition, AtlasWorkbenchState } from "./types";

export const EMPTY_ATLAS_STATE: AtlasWorkbenchState = {
  cards: [],
  selectedCardId: null
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

  return {
    id: options.id ?? makeAtlasId("card"),
    type: cardType,
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
    cards: [...state.cards, card],
    selectedCardId: card.id
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
    cards: state.cards.filter((card) => card.id !== cardId),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId
  };
}

export function getSelectedAtlasCard(state: AtlasWorkbenchState) {
  return state.cards.find((card) => card.id === state.selectedCardId) ?? null;
}

function makeAtlasId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
