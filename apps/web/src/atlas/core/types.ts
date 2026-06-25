export const ATLAS_CARD_TYPES = [
  "object",
  "decision",
  "data",
  "function",
  "constraint",
  "objective"
] as const;

export type AtlasCardType = (typeof ATLAS_CARD_TYPES)[number];

export type AtlasPosition = {
  x: number;
  y: number;
};

export type AtlasTag = {
  key: string;
  value: string;
};

export type AtlasProperty = {
  id: string;
  name: string;
  value: string | number | boolean | null;
};

export type AtlasCard = {
  id: string;
  type: AtlasCardType;
  title: string;
  position: AtlasPosition;
  tags: AtlasTag[];
  properties: AtlasProperty[];
  notes: string;
};

export type AtlasWorkbenchState = {
  cards: AtlasCard[];
  selectedCardId: string | null;
};

export type AtlasAction =
  | { type: "card.create"; cardType: AtlasCardType }
  | { type: "card.select"; cardId: string | null }
  | { type: "card.move"; cardId: string; position: AtlasPosition }
  | { type: "card.delete"; cardId: string }
  | { type: "workbench.clear" }
  | { type: "workbench.load"; state: AtlasWorkbenchState };
