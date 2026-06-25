import type { DeckCard } from "../core/types/card";
import type { GameMode } from "../core/types/mode";
import type { CardInstance, NoteObject, Orientation, SessionState } from "../core/types/session";
import { getEffectModWithAspectFallback } from "../core/constants/aspect";

export type TableauCardSummary = {
  instanceId: string;
  cardId: string;
  cardname: string;
  domain: string;
  subdomain: string;
  orientation: Orientation;
  displayMode: string;
  scientificTwin: string;
  activeEffect: string;
  x: number;
  y: number;
  roughZone: string;
  notes: TableauNoteSummary[];
};

export type TableauNoteSummary = {
  id: string;
  kind: string;
  text: string;
  attachedTo?: string;
};

export type NearestNeighborSummary = {
  fromInstanceId: string;
  toInstanceId: string;
  distance: number;
};

export type TableauSummary = {
  question: string;
  context: string;
  activeMode: {
    id: string;
    name: string;
    purpose: string;
    domainVector: Record<string, string>;
  } | null;
  placedCards: TableauCardSummary[];
  notes: TableauNoteSummary[];
  spatialRelations: {
    cardsGroupedByDomain: Record<string, string[]>;
    nearestNeighbors: NearestNeighborSummary[];
    modifierAttachments: Record<string, TableauNoteSummary[]>;
    roughZones: Record<string, string[]>;
  };
  synthesis?: SessionState["synthesis"];
  conclusion?: string;
  nextMove?: string;
};

function text(value: string | undefined | null) {
  return value?.trim() ?? "";
}

function getActiveEffect(card: DeckCard | undefined, orientation: Orientation) {
  if (!card) return "";
  if (orientation === "reversed") return text(card.effectBad) || card.cardname;
  if (orientation === "modifier") {
    return text(getEffectModWithAspectFallback(card.domain, card.effectMod)) || card.cardname;
  }
  if (orientation === "question") return text(card.question) || text(card.summary) || card.cardname;
  return text(card.effectGood) || card.cardname;
}

function noteSummary(note: NoteObject): TableauNoteSummary {
  return {
    id: note.id,
    kind: note.noteKind,
    text: note.text,
    attachedTo: note.attachedTo
  };
}

function getRoughZone(card: CardInstance) {
  const centerX = card.x;
  const centerY = card.y;

  if (centerY >= 980) return "Source";
  if (centerY <= 340) return "Volition";
  if (centerX < 1080 && centerY >= 430 && centerY <= 870) return "Chameleon";
  if (centerX >= 1080 && centerY >= 430 && centerY <= 870) return "Structure";
  if (centerY > 340 && centerY < 980) return "Void";
  return "Unclassified";
}

function nearestNeighborFor(card: CardInstance, cards: CardInstance[]): NearestNeighborSummary | null {
  let nearest: NearestNeighborSummary | null = null;

  for (const candidate of cards) {
    if (candidate.instanceId === card.instanceId) continue;

    const distance = Math.round(Math.hypot(candidate.x - card.x, candidate.y - card.y));
    if (!nearest || distance < nearest.distance) {
      nearest = {
        fromInstanceId: card.instanceId,
        toInstanceId: candidate.instanceId,
        distance
      };
    }
  }

  return nearest;
}

function groupPush(groups: Record<string, string[]>, key: string, value: string) {
  groups[key] = [...(groups[key] ?? []), value];
}

export function summarizeTableau(
  session: SessionState,
  cardsById: Map<string, DeckCard>,
  activeMode: GameMode | null
): TableauSummary {
  const notes = session.notes.map(noteSummary);
  const groupedByDomain: Record<string, string[]> = {};
  const roughZones: Record<string, string[]> = {};
  const modifierAttachments: Record<string, TableauNoteSummary[]> = {};

  const placedCards = session.tableau.map((instance) => {
    const card = cardsById.get(instance.cardId);
    const attachedNotes = session.notes
      .filter((note) => note.attachedTo === instance.instanceId)
      .map(noteSummary);
    const domain = card?.domain ?? "Missing";
    const roughZone = getRoughZone(instance);

    groupPush(groupedByDomain, domain, instance.instanceId);
    groupPush(roughZones, roughZone, instance.instanceId);

    if (instance.orientation === "modifier" && attachedNotes.length > 0) {
      modifierAttachments[instance.instanceId] = attachedNotes;
    }

    return {
      instanceId: instance.instanceId,
      cardId: instance.cardId,
      cardname: card?.cardname ?? "Missing card",
      domain,
      subdomain: card?.subdomain ?? "",
      orientation: instance.orientation,
      displayMode: instance.displayMode,
      scientificTwin: card?.twin ?? "",
      activeEffect: getActiveEffect(card, instance.orientation),
      x: Math.round(instance.x),
      y: Math.round(instance.y),
      roughZone,
      notes: attachedNotes
    };
  });

  return {
    question: session.question ?? "",
    context: session.context ?? "",
    activeMode: activeMode
      ? {
          id: activeMode.id,
          name: activeMode.name,
          purpose: activeMode.purpose,
          domainVector: activeMode.domainVector
        }
      : null,
    placedCards,
    notes,
    spatialRelations: {
      cardsGroupedByDomain: groupedByDomain,
      nearestNeighbors: session.tableau
        .map((card) => nearestNeighborFor(card, session.tableau))
        .filter((entry): entry is NearestNeighborSummary => entry !== null),
      modifierAttachments,
      roughZones
    },
    synthesis: session.synthesis,
    conclusion: session.conclusion,
    nextMove: session.nextMove
  };
}
