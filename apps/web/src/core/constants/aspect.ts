import type { DeckCard } from "../types/card";

export const ASPECT_MODIFIER_FALLBACK =
  "Aspect cards modify what aspect of a target y is investigated. Choose a keyword x and interpret x(y), the aspect x of target y.";

export function isAspectDomain(domain: string | undefined) {
  return domain === "Aspect";
}

export function isAspectCard(card: Pick<DeckCard, "domain"> | null | undefined) {
  return isAspectDomain(card?.domain);
}

export function getEffectModWithAspectFallback(domain: string, effectMod: string) {
  if (isAspectDomain(domain)) return ASPECT_MODIFIER_FALLBACK;
  return effectMod;
}
