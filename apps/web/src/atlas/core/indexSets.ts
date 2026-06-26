import type { AtlasCard, AtlasIndexSet, AtlasProperty, AtlasWorkbenchState } from "./types";

export function createIndexSet(name: string, elements: string[]): AtlasIndexSet {
  return {
    name: name.trim() || "Index set",
    elements: elements.map((element) => element.trim()).filter(Boolean)
  };
}

export function createRangeIndexSet(name: string, start: number, end: number): AtlasIndexSet {
  const low = Math.min(start, end);
  const high = Math.max(start, end);
  return createIndexSet(
    name,
    Array.from({ length: high - low + 1 }, (_, index) => String(low + index))
  );
}

export function getIndexSetCards(state: AtlasWorkbenchState | { cards: AtlasCard[] }) {
  return state.cards.filter((card) => card.type === "data" && card.data?.indexSet);
}

export function getIndexSetById(cards: AtlasCard[], indexSetId: string | undefined) {
  if (!indexSetId) return null;
  return cards.find((card) => card.id === indexSetId && card.data?.indexSet) ?? null;
}

export function indexedPropertyLabel(property: AtlasProperty, cards: AtlasCard[]) {
  const indexCard = getIndexSetById(cards, property.indexSetId);
  return indexCard?.data?.indexSet
    ? `${property.name}[${indexCard.data.indexSet.name}]`
    : property.indexSetId
      ? `${property.name}[${property.indexSetId}]`
      : property.name;
}
