import type { DeckCard } from "../core/types/card";
import type { ArrowObject, CardInstance, NoteObject, Pile, SessionState } from "../core/types/session";
import { DOMAIN_ORDER } from "../core/constants/domains";
import { createSession } from "../engine/createSession";
import { createDomainPiles } from "../engine/piles";
import { isAspectCard } from "../core/constants/aspect";
import { getDefaultScriptedPlacementForCard } from "./scriptedPlacement";

const EXAMPLE_CARD_COUNT = 10;

export function buildExampleSession(cards: DeckCard[]): SessionState {
  const session = createSession();
  const selectedCards = selectExampleCards(cards).slice(0, EXAMPLE_CARD_COUNT);
  const usedCardIds = new Set(selectedCards.map((card) => card.id));
  const cardsById = new Map(cards.map((card) => [card.id, card]));

  session.title = "Example session: straight-line model";
  session.question = "When is the straight-line model y = ax + b useful, and where might it fail?";
  session.context =
    "A quickstart-style example: use the deck to inspect a simple linear model, its assumptions, omissions, and decision pressure.";
  session.activeModeId = "standard";
  session.piles = removeUsedCardsFromPiles(createDomainPiles(cards), usedCardIds);
  session.tableau = selectedCards.reduce<CardInstance[]>((placedCards, card, index) => {
    const position = getDefaultScriptedPlacementForCard(card, {
      placedCards,
      cardsById,
      sequenceIndex: index
    });
    placedCards.push({
      instanceId: `example-card-${index + 1}`,
      cardId: card.id,
      x: position.x,
      y: position.y,
      rotation: 0,
      orientation: isAspectCard(card) ? "modifier" : index % 4 === 2 ? "reversed" : "upright",
      displayMode: card.frontImage || card.backImage ? "card-face-and-active-effect" : "text-card",
      face: "front",
      scale: 1,
      hidden: false,
      ablated: false
    });
    return placedCards;
  }, []);
  session.notes = buildExampleNotes();
  session.arrows = buildExampleArrows();
  session.log = [
    {
      id: "example-log-1",
      timestamp: new Date().toISOString(),
      actionType: "example.load",
      label: "Loaded example session"
    }
  ];

  return session;
}

function selectExampleCards(cards: DeckCard[]) {
  const byDomain = DOMAIN_ORDER.flatMap((domain) => {
    const domainCards = cards.filter((card) => card.domain === domain);
    return domainCards.slice(0, domain === "Aspect" ? 2 : 1);
  });
  const supplemental = cards.filter((card) => !byDomain.some((selected) => selected.id === card.id));
  return [...byDomain, ...supplemental];
}

function removeUsedCardsFromPiles(piles: Pile[], usedCardIds: Set<string>) {
  return piles.map((pile) => ({
    ...pile,
    currentOrder: pile.currentOrder.filter((cardId) => !usedCardIds.has(cardId)),
    drawnCardIds: [...pile.drawnCardIds, ...pile.cardIds.filter((cardId) => usedCardIds.has(cardId))]
  }));
}

function buildExampleNotes(): NoteObject[] {
  return [
    {
      id: "example-note-1",
      type: "note",
      x: 1030,
      y: 1490,
      text: "Question: what does y = ax + b assume about the phenomenon?",
      noteKind: "question"
    },
    {
      id: "example-note-2",
      type: "note",
      x: 1780,
      y: 760,
      text: "Problem: nonlinear residuals, changing slope, or omitted variables may define the model boundary.",
      noteKind: "problem"
    },
    {
      id: "example-note-3",
      type: "note",
      x: 1380,
      y: 660,
      text: "Opportunity: use the linear fit as a baseline, then test where residuals reveal structure.",
      noteKind: "opportunity"
    }
  ];
}

function buildExampleArrows(): ArrowObject[] {
  return [
    {
      id: "example-arrow-1",
      type: "arrow",
      x1: 1240,
      y1: 1570,
      x2: 1790,
      y2: 910,
      label: "assumption"
    },
    {
      id: "example-arrow-2",
      type: "arrow",
      x1: 1560,
      y1: 1030,
      x2: 1620,
      y2: 980,
      label: "omission"
    }
  ];
}
