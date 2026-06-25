import type { DeckCard } from "../../core/types/card";

export function isDomainMasterCard(card: DeckCard): boolean {
  const cardName = normalizeName(card.cardname);
  const domain = normalizeName(card.domain);

  return cardName === domain || cardName === normalizeName(`The ${card.domain}`);
}

export function isSubdomainMasterCard(card: DeckCard): boolean {
  if (isDomainMasterCard(card)) return false;

  const subdomain = getCardSubdomain(card);
  if (!subdomain) return false;

  const cardName = normalizeName(card.cardname);
  return cardName === normalizeName(subdomain) || cardName === normalizeName(`The ${subdomain}`);
}

export function isOrdinaryCard(card: DeckCard): boolean {
  return !isDomainMasterCard(card) && !isSubdomainMasterCard(card);
}

export function getCardSubdomain(card: DeckCard): string | null {
  const subdomain = card.subdomain?.trim();
  return subdomain || null;
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the\s+/, "")
    .trim();
}
