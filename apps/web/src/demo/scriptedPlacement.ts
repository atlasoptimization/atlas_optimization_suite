import type { DeckCard } from "../core/types/card";
import type { CardInstance } from "../core/types/session";
import type { DomainName } from "../core/types/domain";
import {
  ACTIVE_BOARD_BOUNDS,
  DRAWING_ZONE_BOUNDS,
  MODEL_CORE_BOUNDS,
  SOURCE_BOUNDS,
  VOLITION_BOUNDS,
  type TableauBounds
} from "../core/constants/tableau";
import { isAspectCard } from "../core/constants/aspect";

const CARD_WIDTH = 126;
const CARD_HEIGHT = 176;

export const SCRIPTED_DOMAIN_BOUNDS: Record<DomainName, TableauBounds> = {
  Aspect: {
    x: DRAWING_ZONE_BOUNDS.x + 250,
    y: DRAWING_ZONE_BOUNDS.y + 70,
    width: 250,
    height: 360
  },
  Source: SOURCE_BOUNDS,
  Volition: VOLITION_BOUNDS,
  Void: {
    x: MODEL_CORE_BOUNDS.x + 310,
    y: MODEL_CORE_BOUNDS.y + 190,
    width: 340,
    height: 250
  },
  Chameleon: {
    x: ACTIVE_BOARD_BOUNDS.x + 965,
    y: ACTIVE_BOARD_BOUNDS.y + 580,
    width: 500,
    height: 520
  },
  Structure: {
    x: ACTIVE_BOARD_BOUNDS.x + 1490,
    y: ACTIVE_BOARD_BOUNDS.y + 580,
    width: 500,
    height: 520
  }
};

export type ScriptedPlacementContext = {
  placedCards?: CardInstance[];
  cardsById?: Map<string, DeckCard>;
  sequenceIndex?: number;
};

export function getDefaultScriptedPlacementForCard(
  card: DeckCard,
  context: ScriptedPlacementContext = {}
) {
  if (isAspectCard(card)) {
    const target = findLatestNonAspectTarget(context.placedCards ?? [], context.cardsById);
    if (target) {
      return {
        x: target.x + CARD_WIDTH + 44,
        y: target.y + 24
      };
    }
  }

  const bounds = SCRIPTED_DOMAIN_BOUNDS[card.domain as DomainName] ?? MODEL_CORE_BOUNDS;
  const domainIndex = countPlacedDomainCards(card.domain, context);
  return pointInsideBounds(bounds, domainIndex + (context.sequenceIndex ?? 0));
}

export function isPointInsideScriptedDomain(card: DeckCard, x: number, y: number) {
  const bounds = SCRIPTED_DOMAIN_BOUNDS[card.domain as DomainName];
  if (!bounds) return false;
  return x >= bounds.x &&
    y >= bounds.y &&
    x + CARD_WIDTH <= bounds.x + bounds.width &&
    y + CARD_HEIGHT <= bounds.y + bounds.height;
}

function pointInsideBounds(bounds: TableauBounds, index: number) {
  const columns = Math.max(1, Math.floor((bounds.width - 44) / (CARD_WIDTH + 64)));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const maxX = bounds.x + bounds.width - CARD_WIDTH - 28;
  const maxY = bounds.y + bounds.height - CARD_HEIGHT - 28;
  return {
    x: Math.min(maxX, bounds.x + 44 + column * (CARD_WIDTH + 64)),
    y: Math.min(maxY, bounds.y + 42 + row * (CARD_HEIGHT + 46))
  };
}

function countPlacedDomainCards(domain: string, context: ScriptedPlacementContext) {
  if (!context.placedCards || !context.cardsById) return 0;
  return context.placedCards.filter((instance) => context.cardsById?.get(instance.cardId)?.domain === domain).length;
}

function findLatestNonAspectTarget(
  placedCards: CardInstance[],
  cardsById: Map<string, DeckCard> | undefined
) {
  if (!cardsById) return null;
  for (let index = placedCards.length - 1; index >= 0; index -= 1) {
    const instance = placedCards[index];
    const card = cardsById.get(instance.cardId);
    if (card && !isAspectCard(card)) return instance;
  }
  return null;
}
