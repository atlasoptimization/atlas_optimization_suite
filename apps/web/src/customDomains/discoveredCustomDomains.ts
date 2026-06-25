import { DOMAIN_ORDER } from "../core/constants/domains";
import type { DeckCard } from "../core/types/card";

export type DiscoveredCustomDomain = {
  id: string;
  name: string;
  folder?: string;
  cardCount: number;
  pdfCount: number;
  previewCount: number;
  cards: DeckCard[];
};

export function getDiscoveredCustomDomains(cards: DeckCard[]): DiscoveredCustomDomain[] {
  const groups = new Map<string, DeckCard[]>();

  for (const card of cards) {
    if (card.origin !== "custom-domain") continue;
    const id = card.customDomainId || card.domain;
    groups.set(id, [...(groups.get(id) ?? []), card]);
  }

  return [...groups.entries()]
    .map(([id, domainCards]) => ({
      id,
      name: domainCards[0]?.domain ?? id,
      folder: domainCards[0]?.raw.customDomainFolder,
      cardCount: domainCards.length,
      pdfCount: domainCards.filter((card) => Boolean(card.pdfPath)).length,
      previewCount: domainCards.filter((card) => Boolean(card.frontImage || card.backImage)).length,
      cards: domainCards
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function getActiveCustomDomainCards(
  domains: DiscoveredCustomDomain[],
  activeIds: string[]
) {
  const active = new Set(activeIds);
  return domains.flatMap((domain) => (active.has(domain.id) ? domain.cards : []));
}

export function getActiveDomainNames(
  canonicalDomains: string[] = DOMAIN_ORDER,
  activeCustomDomains: DiscoveredCustomDomain[]
) {
  return [...canonicalDomains, ...activeCustomDomains.map((domain) => domain.name)];
}
