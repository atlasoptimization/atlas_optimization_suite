import type { DeckCard } from "../core/types/card";
import { DOMAIN_ORDER } from "../core/constants/domains";
import type { DrawCycle, Pile } from "../core/types/session";

function pileDomainsForCards(deckCards: DeckCard[]) {
  const cardDomains = new Set(deckCards.map((card) => card.domain).filter(Boolean));
  return [
    ...DOMAIN_ORDER,
    ...[...cardDomains].filter(
      (domain) => !DOMAIN_ORDER.includes(domain as (typeof DOMAIN_ORDER)[number])
    )
  ];
}

export function createDomainPiles(deckCards: DeckCard[]): Pile[] {
  return pileDomainsForCards(deckCards).map((domain) => {
    const cardIds = deckCards
      .filter((card) => card.domain === domain)
      .map((card) => card.id);

    return shufflePile({
      id: `domain-${domain.toLowerCase()}`,
      name: domain,
      domain,
      cardIds,
      currentOrder: [...cardIds],
      drawnCardIds: [],
      discardCardIds: []
    });
  });
}

export function mergeDomainPiles(deckCards: DeckCard[], existingPiles: Pile[]): Pile[] {
  const freshPiles = createDomainPiles(deckCards);

  return freshPiles.map((freshPile) => {
    const existingPile = existingPiles.find((pile) => pile.domain === freshPile.domain);
    if (!existingPile) return freshPile;

    const knownCardIds = new Set(freshPile.cardIds);
    const drawnCardIds = existingPile.drawnCardIds.filter((cardId) => knownCardIds.has(cardId));
    const discardCardIds = existingPile.discardCardIds.filter((cardId) => knownCardIds.has(cardId));
    const unavailable = new Set([...drawnCardIds, ...discardCardIds]);
    const existingCurrentOrder = existingPile.currentOrder.filter(
      (cardId) => knownCardIds.has(cardId) && !unavailable.has(cardId)
    );
    const currentOrder = [
      ...existingCurrentOrder,
      ...freshPile.currentOrder.filter(
        (cardId) => !existingCurrentOrder.includes(cardId) && !unavailable.has(cardId)
      )
    ];

    return {
      ...freshPile,
      currentOrder,
      drawnCardIds,
      discardCardIds,
      shuffleSeed: existingPile.shuffleSeed
    };
  });
}

export function drawFromPile(pile: Pile): { pile: Pile; cardId: string | null } {
  const [cardId, ...remainingOrder] = pile.currentOrder;

  if (!cardId) {
    return { pile, cardId: null };
  }

  return {
    pile: {
      ...pile,
      currentOrder: remainingOrder,
      drawnCardIds: [...pile.drawnCardIds, cardId]
    },
    cardId
  };
}

export function drawManyFromPile(pile: Pile, count: number): { pile: Pile; cardIds: string[] } {
  let nextPile = pile;
  const cardIds: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const result = drawFromPile(nextPile);
    nextPile = result.pile;
    if (!result.cardId) break;
    cardIds.push(result.cardId);
  }

  return { pile: nextPile, cardIds };
}

export function drawSpecificCardFromPile(
  pile: Pile,
  cardId: string
): { pile: Pile; cardId: string | null } {
  if (!pile.currentOrder.includes(cardId)) {
    return { pile, cardId: null };
  }

  return {
    pile: {
      ...pile,
      currentOrder: pile.currentOrder.filter((candidate) => candidate !== cardId),
      drawnCardIds: pile.drawnCardIds.includes(cardId)
        ? pile.drawnCardIds
        : [...pile.drawnCardIds, cardId]
    },
    cardId
  };
}

export function shufflePile(pile: Pile, seed?: string): Pile {
  const random = seed ? seededRandom(seed) : Math.random;
  const currentOrder = [...pile.currentOrder];

  for (let index = currentOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [currentOrder[index], currentOrder[swapIndex]] = [
      currentOrder[swapIndex],
      currentOrder[index]
    ];
  }

  return {
    ...pile,
    currentOrder,
    shuffleSeed: seed ?? pile.shuffleSeed
  };
}

export function getNextDomain(drawCycle: DrawCycle): string {
  if (drawCycle.order.length === 0) return "";
  return drawCycle.order[drawCycle.index % drawCycle.order.length];
}

export function advanceDrawCycle(drawCycle: DrawCycle): DrawCycle {
  if (drawCycle.order.length === 0) return drawCycle;
  return {
    ...drawCycle,
    index: (drawCycle.index + 1) % drawCycle.order.length
  };
}

export function resetPiles(piles: Pile[]): Pile[] {
  return piles.map((pile) =>
    shufflePile({
      ...pile,
      currentOrder: [...pile.cardIds],
      drawnCardIds: [],
      discardCardIds: []
    })
  );
}

export function addCardToDiscard(pile: Pile, cardId: string): Pile {
  return {
    ...pile,
    currentOrder: pile.currentOrder.filter((candidate) => candidate !== cardId),
    drawnCardIds: pile.drawnCardIds.filter((candidate) => candidate !== cardId),
    discardCardIds: pile.discardCardIds.includes(cardId)
      ? pile.discardCardIds
      : [...pile.discardCardIds, cardId]
  };
}

export function playCardFromDiscard(pile: Pile, cardId: string): Pile {
  return {
    ...pile,
    discardCardIds: pile.discardCardIds.filter((candidate) => candidate !== cardId),
    drawnCardIds: pile.drawnCardIds.includes(cardId)
      ? pile.drawnCardIds
      : [...pile.drawnCardIds, cardId]
  };
}

export function returnDiscardCardToPile(pile: Pile, cardId: string): Pile {
  return {
    ...pile,
    discardCardIds: pile.discardCardIds.filter((candidate) => candidate !== cardId),
    drawnCardIds: pile.drawnCardIds.filter((candidate) => candidate !== cardId),
    currentOrder: pile.currentOrder.includes(cardId) ? pile.currentOrder : [...pile.currentOrder, cardId]
  };
}

export function returnAllDiscardsToPile(pile: Pile): Pile {
  return {
    ...pile,
    currentOrder: [...pile.currentOrder, ...pile.discardCardIds],
    discardCardIds: []
  };
}

function seededRandom(seed: string) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}
