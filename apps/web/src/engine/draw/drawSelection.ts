import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { DomainName } from "../../core/types/domain";
import type { Pile } from "../../core/types/session";
import { modeIsSecret, modeUsesCount, type DrawMode } from "./drawModes";
import { getDrawableCardsForSubset, type DrawSubset } from "./drawSubsets";

export type DrawSubsetKind =
  | "full-domain"
  | "domain-masters"
  | "subdomain-masters"
  | "domain-and-subdomain-masters"
  | "specific-subdomain";

export function buildDrawSubset(
  kind: DrawSubsetKind,
  domain: DomainName,
  subdomain = ""
): DrawSubset {
  if (kind === "domain-masters") return { kind };
  if (kind === "subdomain-masters") return { kind, domain };
  if (kind === "domain-and-subdomain-masters") return { kind, domain };
  if (kind === "specific-subdomain") return { kind, domain, subdomain };
  return { kind, domain };
}

export function buildDomainDrawSubset(
  kind: DrawSubsetKind,
  domain: DomainName,
  subdomain = ""
): DrawSubset {
  if (kind === "domain-masters") return { kind, domain };
  return buildDrawSubset(kind, domain, subdomain);
}

export function getAvailableCardsForDrawSubset(
  cards: DeckCard[],
  piles: Pile[],
  subset: DrawSubset
) {
  const currentOrderIds = new Set(piles.flatMap((pile) => pile.currentOrder));
  return getDrawableCardsForSubset(cards, subset).filter((card) => currentOrderIds.has(card.id));
}

export function sampleCards(cards: DeckCard[], count: number) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, clampDrawCount(count, cards.length));
}

export function clampDrawCount(count: number, availableCount: number) {
  return Math.max(1, Math.min(count, availableCount));
}

export function createFilteredDrawAction(
  cards: DeckCard[],
  mode: DrawMode,
  requestedCount: number
): DeckAction | null {
  const drawCount = modeUsesCount(mode) ? requestedCount : 1;
  const selected = sampleCards(cards, drawCount).map((card) => ({
    cardId: card.id,
    domain: card.domain
  }));

  if (selected.length === 0) return null;

  if (mode === "choose-1-from-n") {
    return { type: "draw.startFilteredChoice", cards: selected };
  }

  return {
    type: "draw.placeFilteredCards",
    cards: selected,
    hidden: modeIsSecret(mode)
  };
}
