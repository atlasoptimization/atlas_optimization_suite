import type { GameMode } from "../core/types/mode";
import type { SessionState } from "../core/types/session";
import type { DeckCard } from "../core/types/card";
import { DOMAIN_ORDER } from "../core/constants/domains";
import { domainVector } from "./modeDomain";

export const entropyAuctionMode: GameMode = {
  id: "entropy-auction",
  name: "Entropy Auction",
  purpose: "Prioritize plurality in a group",
  shortDescription: "A group mode for drawing many perspectives and arguing which card matters most.",
  whenToUse:
    "Use with a group when you want fast plurality, competing interpretations, and a visible choice among alternatives.",
  procedureSummary:
    "Draw exactly two candidates from each canonical domain, show the twelve-card pool, argue relevance, keep one, and discard the rest.",
  commentary:
    "All canonical domains are random. Entropy Auction combines two candidates each from Source, Structure, Chameleon, Void, Volition, and Aspect into one shared auction pool.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "R",
    Structure: "R",
    Chameleon: "R",
    Void: "R",
    Volition: "R",
    Aspect: "R"
  }),
  description:
    "Entropy Auction turns plurality into a fast selection process: draw candidates, argue for relevance, and keep what carries the session forward.",
  setupInstructions: [
    "Use a group table.",
    "Draw random candidates and distribute interpretive attention across the group.",
    "Keep the most useful card and discard the rest."
  ],
  nextStepHint: (state) => {
    const count = getEntropyAuctionCandidates(state).length;
    return `Draw ${count || 12} mixed-domain candidates and auction for the most useful one.`;
  },
  recommendedAction: (state, cards = []) => {
    const candidates = getEntropyAuctionCandidates(state, cards);
    return {
      label: "Auction 12 mixed-domain cards",
      description:
        "Draw two candidates from each canonical domain, choose one winner, and discard all unchosen candidates to their source discard piles.",
      actionKind: "choose-filtered-candidates",
      domain: "Mixed",
      cards: candidates,
      count: candidates.length,
      drawMode: "choose-1-from-n",
      subset: "two-per-canonical-domain"
    };
  }
};

function getEntropyAuctionCandidates(state: SessionState, cards: DeckCard[] = []) {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return DOMAIN_ORDER.flatMap((domain) => {
    const pile = state.piles.find((candidate) => candidate.domain === domain);
    if (!pile) return [];
    return pile.currentOrder
      .filter((cardId) => cardsById.size === 0 || cardsById.has(cardId))
      .slice(0, 2)
      .map((cardId) => ({ cardId, domain }));
  });
}
