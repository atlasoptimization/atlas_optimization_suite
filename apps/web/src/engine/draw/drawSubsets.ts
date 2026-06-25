import type { DeckCard } from "../../core/types/card";
import type { DomainName } from "../../core/types/domain";
import {
  getCardSubdomain,
  isDomainMasterCard,
  isSubdomainMasterCard
} from "../cards/cardClassification";

export type DrawSubset =
  | { kind: "full-domain"; domain: DomainName }
  | { kind: "domain-masters"; domain?: DomainName }
  | { kind: "subdomain-masters"; domain?: DomainName }
  | { kind: "domain-and-subdomain-masters"; domain?: DomainName }
  | { kind: "specific-subdomain"; domain: DomainName; subdomain: string };

export function getDrawableCardsForSubset(cards: DeckCard[], subset: DrawSubset): DeckCard[] {
  switch (subset.kind) {
    case "full-domain":
      return cards.filter((card) => card.domain === subset.domain);

    case "domain-masters":
      return cards.filter(
        (card) => (!subset.domain || card.domain === subset.domain) && isDomainMasterCard(card)
      );

    case "subdomain-masters":
      return cards.filter(
        (card) =>
          (!subset.domain || card.domain === subset.domain) && isSubdomainMasterCard(card)
      );

    case "domain-and-subdomain-masters":
      return cards.filter(
        (card) =>
          (!subset.domain || card.domain === subset.domain) &&
          (isDomainMasterCard(card) || isSubdomainMasterCard(card))
      );

    case "specific-subdomain":
      return cards.filter(
        (card) =>
          card.domain === subset.domain &&
          normalizeSubdomain(getCardSubdomain(card)) === normalizeSubdomain(subset.subdomain)
      );
  }
}

export function getSubdomainsForDomain(cards: DeckCard[], domain: string): string[] {
  return [
    ...new Set(
      cards
        .filter((card) => card.domain === domain)
        .map(getCardSubdomain)
        .filter((subdomain): subdomain is string => Boolean(subdomain))
    )
  ].sort((a, b) => a.localeCompare(b));
}

function normalizeSubdomain(value: string | null) {
  return (value ?? "").trim().toLowerCase();
}
