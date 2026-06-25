import type { DeckCard } from "../../core/types/card";
import type { CardNameMode } from "../../core/types/view";
import { DOMAIN_ORDER } from "../../core/constants/domains";
import {
  isDomainMasterCard,
  isSubdomainMasterCard
} from "../../engine/cards/cardClassification";

export type CardBrowserGroup = {
  domain: string;
  count: number;
  domainMasterCards: DeckCard[];
  subdomains: CardBrowserSubdomainGroup[];
  uncategorizedCards: DeckCard[];
};

export type CardBrowserSubdomainGroup = {
  subdomain: string;
  count: number;
  masterCards: DeckCard[];
  cards: DeckCard[];
};

export function getCardDisplayName(card: DeckCard, cardNameMode: CardNameMode) {
  if (cardNameMode === "scientific") return card.twin || card.cardname;
  return card.cardname;
}

export function getCardNameModeFromToggles(showMythicNames: boolean, showScientificNames: boolean): CardNameMode {
  if (showMythicNames && showScientificNames) return "both";
  if (showScientificNames) return "scientific";
  return "mythic";
}

export function groupCardsByDomainAndSubdomain(cards: DeckCard[]): CardBrowserGroup[] {
  const domains = new Map<string, DeckCard[]>();

  for (const card of cards) {
    domains.set(card.domain, [...(domains.get(card.domain) ?? []), card]);
  }

  return [...domains.entries()]
    .sort(([a], [b]) => domainSortIndex(a) - domainSortIndex(b))
    .map(([domain, domainCards]) => buildDomainGroup(domain, domainCards));
}

function buildDomainGroup(domain: string, cards: DeckCard[]): CardBrowserGroup {
  const domainMasterCards: DeckCard[] = [];
  const uncategorizedCards: DeckCard[] = [];
  const subdomains = new Map<string, { masterCards: DeckCard[]; cards: DeckCard[] }>();

  for (const card of cards) {
    if (isDomainMasterCard(card)) {
      domainMasterCards.push(card);
      continue;
    }

    const subdomain = card.subdomain?.trim();
    if (!subdomain) {
      uncategorizedCards.push(card);
      continue;
    }

    const group = subdomains.get(subdomain) ?? { masterCards: [], cards: [] };
    if (isSubdomainMasterCard(card)) group.masterCards.push(card);
    else group.cards.push(card);
    subdomains.set(subdomain, group);
  }

  return {
    domain,
    count: cards.length,
    domainMasterCards,
    subdomains: [...subdomains.entries()].map(([subdomain, group]) => ({
      subdomain,
      count: group.masterCards.length + group.cards.length,
      masterCards: group.masterCards,
      cards: group.cards
    })),
    uncategorizedCards
  };
}

function domainSortIndex(domain: string) {
  const index = DOMAIN_ORDER.indexOf(domain as (typeof DOMAIN_ORDER)[number]);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
