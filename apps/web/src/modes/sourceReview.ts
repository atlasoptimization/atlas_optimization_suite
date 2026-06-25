import type { DeckCard } from "../core/types/card";
import type { GameMode } from "../core/types/mode";
import type { SessionState } from "../core/types/session";
import {
  isDomainMasterCard,
  isOrdinaryCard,
  isSubdomainMasterCard
} from "../engine/cards/cardClassification";
import { domainVector } from "./modeDomain";

export type SourceReviewPhase =
  | "place-source-masters"
  | "draw-aspect-masters"
  | "draw-aspect-ordinary"
  | "complete";

export function getSourceReviewSourceMasterCards(cards: DeckCard[]) {
  return cards.filter(
    (card) =>
      card.domain === "Source" &&
      (isDomainMasterCard(card) || isSubdomainMasterCard(card))
  );
}

export function getSourceReviewPhase(state: SessionState, cards: DeckCard[]): SourceReviewPhase {
  const placedIds = new Set(state.tableau.map((instance) => instance.cardId));
  const missingSourceMasters = getSourceReviewSourceMasterCards(cards).filter(
    (card) => !placedIds.has(card.id)
  );
  if (missingSourceMasters.length > 0) return "place-source-masters";

  if (getAvailableAspectCards(state, cards, "masters").length > 0) {
    return "draw-aspect-masters";
  }

  if (getAvailableAspectCards(state, cards, "ordinary").length > 0) {
    return "draw-aspect-ordinary";
  }

  return "complete";
}

export function getSourceReviewRecommendation(state: SessionState, cards: DeckCard[] = []) {
  const phase = getSourceReviewPhase(state, cards);
  const placedIds = new Set(state.tableau.map((instance) => instance.cardId));

  if (phase === "place-source-masters") {
    const missingSourceMasters = getSourceReviewSourceMasterCards(cards).filter(
      (card) => !placedIds.has(card.id)
    );

    return {
      label: "Place Source master cards",
      description:
        "Place The Source domain master card and all Source subdomain master cards before drawing Aspect cards.",
      actionKind: "place-cards" as const,
      domain: "Source",
      cards: missingSourceMasters.map((card) => ({ cardId: card.id, domain: card.domain })),
      subset: "domain-and-subdomain-masters"
    };
  }

  if (phase === "draw-aspect-masters") {
    const nextCard = getAvailableAspectCards(state, cards, "masters")[0];
    return {
      label: "Draw Aspect master card",
      description:
        "Draw from Aspect master cards first: the Aspect domain master and Aspect subdomain masters.",
      actionKind: "draw-specific" as const,
      domain: "Aspect",
      cardId: nextCard?.id,
      drawMode: "random-1" as const,
      subset: "domain-and-subdomain-masters"
    };
  }

  if (phase === "draw-aspect-ordinary") {
    const nextCard = getAvailableAspectCards(state, cards, "ordinary")[0];
    return {
      label: "Draw ordinary Aspect card",
      description:
        "Aspect master cards are exhausted. Draw the remaining ordinary Aspect domain cards as detailed reflective prompts.",
      actionKind: "draw-specific" as const,
      domain: "Aspect",
      cardId: nextCard?.id,
      drawMode: "random-1" as const,
      subset: "full-domain"
    };
  }

  return {
    label: "Source Review complete",
    description: "Source Review complete: no Aspect cards remain in the Aspect pile.",
    actionKind: "complete" as const
  };
}

function getAvailableAspectCards(
  state: SessionState,
  cards: DeckCard[],
  kind: "masters" | "ordinary"
) {
  const aspectPile = state.piles.find((pile) => pile.domain === "Aspect");
  if (!aspectPile) return [];

  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return aspectPile.currentOrder
    .map((cardId) => cardsById.get(cardId))
    .filter((card): card is DeckCard => card !== undefined && card.domain === "Aspect")
    .filter((card) =>
      kind === "masters"
        ? isDomainMasterCard(card) || isSubdomainMasterCard(card)
        : isOrdinaryCard(card)
    );
}

export const sourceReviewMode: GameMode = {
  id: "source-review",
  name: "Source Review",
  purpose: "Understand a phenomenon, literature, or source material",
  shortDescription: "Source setup plus Aspect prompts for reading source material.",
  whenToUse:
    "Use when the task is to understand source material before building a broader model.",
  procedureSummary:
    "First place all Source master cards. Then draw Aspect master cards until exhausted. Then draw the remaining ordinary Aspect cards.",
  commentary:
    "Source is fixed/setup and Aspect is random. Source cards structure the phenomenon; Aspect cards become reflective modifier prompts.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "A",
    Chameleon: "A",
    Void: "A",
    Volition: "A",
    Aspect: "R"
  }),
  description:
    "Source Review keeps Source as setup material and uses Aspect as the active reflective draw pile.",
  setupInstructions: [
    "Put the book, paper, survey, dataset, or source document beside the desk.",
    "Place The Source and all Source subdomain master cards.",
    "Draw Aspect master cards first, then ordinary Aspect cards for detailed lenses."
  ],
  nextStepHint: () => "Place Source masters first, then draw Aspect lenses.",
  recommendedAction: getSourceReviewRecommendation
};
