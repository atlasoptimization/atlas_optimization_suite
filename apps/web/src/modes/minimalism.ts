import { DOMAIN_ORDER } from "../core/constants/domains";
import type { GameMode } from "../core/types/mode";
import type { DeckCard } from "../core/types/card";
import type { SessionState } from "../core/types/session";
import { isDomainMasterCard, isSubdomainMasterCard } from "../engine/cards/cardClassification";

export const minimalismMode: GameMode = {
  id: "minimalism",
  name: "Minimalism",
  purpose: "Initial architecture / general orientation",
  shortDescription: "Compact mode that starts with the six domain master cards, then expands through subdomain masters.",
  whenToUse:
    "Use at the beginning of a session, when the question needs a high-level scaffold before detailed cards are added.",
  procedureSummary:
    "Place the six domain master cards, then draw subdomain master cards one by one in the normal domain cycle.",
  domainVector: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, "F"])),
  description:
    "Minimalism begins with the six domain master cards, then expands one layer deeper by drawing subdomain master cards in the normal domain cycle. Use it to build a compact map of the modelling space before adding ordinary cards.",
  setupInstructions: [
    "Place one master card for each domain.",
    "Read the six-domain architecture as the initial shape of the problem.",
    "Continue with Next to draw one subdomain master card at a time.",
    "Stop when the subdomain master layer is exhausted, then add ordinary cards manually if useful."
  ],
  nextStepHint: (state) =>
    hasPlacedDomainMasters(state, [])
      ? "Draw the next subdomain master card in the domain cycle."
      : "Place the six domain master cards.",
  recommendedAction: getMinimalismRecommendation
};

export function getMinimalismRecommendation(state: SessionState, cards: DeckCard[] = []) {
  if (!hasPlacedDomainMasters(state, cards)) {
    return {
      label: "Place domain master cards",
      description: "Place the six domain master cards without drawing ordinary cards.",
      mechanical: "Place all six domain master cards.",
      interpretation: "Use the six masters as the initial architecture of the problem space.",
      actionKind: "place-domain-masters" as const,
      subset: "domain-masters",
      targetDomains: [...DOMAIN_ORDER]
    };
  }

  const nextCard = getNextMinimalismSubdomainMaster(state, cards);
  if (!nextCard) {
    return {
      label: "Minimalism complete",
      description: "All available subdomain master cards have been drawn.",
      mechanical: "Minimalism complete",
      interpretation: "Review the compact domain and subdomain map before adding ordinary cards or notes.",
      actionKind: "complete" as const,
      kind: "ending" as const
    };
  }

  return {
    label: `Draw ${nextCard.domain} subdomain master`,
    description: `Draw ${nextCard.cardname} as the next ${nextCard.domain} subdomain master card.`,
    mechanical: `Draw one subdomain master card from ${nextCard.domain}.`,
    interpretation: "Use this subdomain master to refine the initial map of the deck and the problem space.",
    actionKind: "draw-specific" as const,
    domain: nextCard.domain,
    cardId: nextCard.id,
    drawMode: "random-1" as const,
    subset: "subdomain-masters",
    targetDomains: [nextCard.domain]
  };
}

export function getNextMinimalismSubdomainMaster(state: SessionState, cards: DeckCard[]) {
  const unavailableCardIds = new Set([
    ...state.tableau.map((instance) => instance.cardId),
    ...state.piles.flatMap((pile) => [...pile.drawnCardIds, ...pile.discardCardIds])
  ]);
  const subdomainMasters = cards.filter(isSubdomainMasterCard);
  const drawnSubdomainCount = subdomainMasters.filter((card) => unavailableCardIds.has(card.id)).length;

  for (let offset = 0; offset < DOMAIN_ORDER.length; offset += 1) {
    const domain = DOMAIN_ORDER[(drawnSubdomainCount + offset) % DOMAIN_ORDER.length];
    const candidate = subdomainMasters.find(
      (card) => card.domain === domain && !unavailableCardIds.has(card.id)
    );
    if (candidate) return candidate;
  }

  return null;
}

export function hasPlacedDomainMasters(state: SessionState, cards: DeckCard[]) {
  const placedCardIds = new Set(state.tableau.map((instance) => instance.cardId));
  const domainMasterCards = cards.filter(isDomainMasterCard);
  if (domainMasterCards.length > 0) {
    return DOMAIN_ORDER.every((domain) => {
      const master = domainMasterCards.find((card) => card.domain === domain);
      return !master || placedCardIds.has(master.id);
    });
  }

  return DOMAIN_ORDER.every((domain) =>
    state.tableau.some((instance) => instance.cardId.toLowerCase().includes(domain.toLowerCase()))
  );
}
