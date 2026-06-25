import type { DeckAction } from "../core/types/action";
import type { CardFace } from "../core/types/view";
import type {
  CardInstance,
  CardRotation,
  NoteObject,
  SessionState
} from "../core/types/session";
import {
  DEFAULT_CARD_DISPLAY_MODE,
  DEFAULT_CARD_FACE
} from "../core/constants/cardDisplay";
import { isAspectDomain } from "../core/constants/aspect";
import { TABLEAU_CENTER } from "../core/constants/tableau";
import { DEFAULT_MODE_ID } from "../modes/constants";
import { computeElapsedMs } from "../ui/timer/timerUtils";
import {
  advanceDrawCycle,
  addCardToDiscard,
  createDomainPiles,
  drawFromPile,
  drawManyFromPile,
  drawSpecificCardFromPile,
  mergeDomainPiles,
  playCardFromDiscard,
  returnAllDiscardsToPile,
  returnDiscardCardToPile,
  resetPiles,
  shufflePile
} from "./piles";
import { getNextDrawPositionForDomain } from "./placement/domainPlacement";
import { appendSessionLog } from "./sessionLog";

const DEFAULT_CLEARED_TIMER = {
  visible: false,
  mode: "stopwatch" as const,
  status: "idle" as const,
  accumulatedMs: 0,
  durationMs: 120000,
  messageOnFinish: "Next",
  actionOnFinish: "none" as const,
  autoRestart: false
};

function makeInstanceId() {
  return `tc_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeNoteId() {
  return `note_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeArrowId() {
  return `arrow_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function nextRotation(rotation: CardRotation): CardRotation {
  return ((rotation + 90) % 360) as CardRotation;
}

function nextOrientation(orientation: CardInstance["orientation"]): CardInstance["orientation"] {
  if (orientation === "upright") return "reversed";
  if (orientation === "reversed") return "modifier";
  if (orientation === "modifier") return "question";
  return "upright";
}

function randomVisibleOrientation(): CardInstance["orientation"] {
  const orientations: CardInstance["orientation"][] = ["upright", "reversed", "modifier", "question"];
  return orientations[Math.floor(Math.random() * orientations.length)] ?? "upright";
}

function orientationForNewCard(
  domain: string | undefined,
  hidden: boolean,
  explicit?: CardInstance["orientation"]
): CardInstance["orientation"] {
  if (isAspectDomain(domain)) return "modifier";
  if (explicit) return explicit;
  return hidden ? randomVisibleOrientation() : "upright";
}

const MIN_CARD_SCALE = 0.4;
const MAX_CARD_SCALE = 3;
const CARD_SCALE_STEP = 0.15;

function clampCardScale(scale: number) {
  return Math.min(MAX_CARD_SCALE, Math.max(MIN_CARD_SCALE, Number(scale.toFixed(2))));
}

function nextFace(face: CardFace): CardFace {
  if (face === "back") return "front";
  if (face === "front") return "back";
  return "both";
}

function toggleFaceDisplayMode(displayMode: CardInstance["displayMode"]) {
  if (displayMode === "pdf-front") return "pdf-back";
  if (displayMode === "pdf-back") return "pdf-front";
  return displayMode;
}

function placeCard(
  state: SessionState,
  cardId: string,
  x?: number,
  y?: number,
  displayMode: CardInstance["displayMode"] = DEFAULT_CARD_DISPLAY_MODE,
  face: CardInstance["face"] = DEFAULT_CARD_FACE,
  scale = 1,
  hidden = false,
  orientation: CardInstance["orientation"] = "upright"
): SessionState {
  const n = state.tableau.length;
  const placed: CardInstance = {
    instanceId: makeInstanceId(),
    cardId,
    x: x ?? TABLEAU_CENTER.x - 160 + (n % 6) * 42,
    y: y ?? TABLEAU_CENTER.y - 110 + (n % 6) * 32,
    rotation: 0,
    orientation,
    displayMode,
    face,
    scale: clampCardScale(scale),
    hidden,
    ablated: false
  };

  return {
    ...state,
    tableau: [...state.tableau, placed],
    selectedInstanceId: placed.instanceId,
    selectedNoteId: null,
    selectedArrowId: null
  };
}

function logCardPlaced(state: SessionState, placed: CardInstance, hidden: boolean) {
  return appendSessionLog(state, {
    actionType: hidden ? "card.placeHidden" : "card.place",
    label: hidden ? "Placed hidden card" : "Placed card",
    cardId: placed.cardId,
    instanceId: placed.instanceId
  });
}

function placeCardWithLog(
  state: SessionState,
  cardId: string,
  x?: number,
  y?: number,
  displayMode: CardInstance["displayMode"] = DEFAULT_CARD_DISPLAY_MODE,
  face: CardInstance["face"] = DEFAULT_CARD_FACE,
  scale = 1,
  hidden = false,
  orientation: CardInstance["orientation"] = "upright"
): SessionState {
  const nextState = placeCard(state, cardId, x, y, displayMode, face, scale, hidden, orientation);
  const placed = nextState.tableau[nextState.tableau.length - 1];
  return placed ? logCardPlaced(nextState, placed, hidden) : nextState;
}

function placeDrawnCard(
  state: SessionState,
  cardId: string,
  domain: string,
  hidden = false,
  displayMode: CardInstance["displayMode"] = DEFAULT_CARD_DISPLAY_MODE,
  face: CardInstance["face"] = DEFAULT_CARD_FACE,
  scale = 1
): SessionState {
  const position = getNextDrawPositionForDomain({
    domain,
    tableau: state.tableau,
    piles: state.piles
  });

  return placeCardWithLog(
    state,
    cardId,
    position?.x,
    position?.y,
    displayMode,
    face,
    scale,
    hidden,
    orientationForNewCard(domain, hidden)
  );
}

function markFilteredCardsDrawn(
  state: SessionState,
  refs: { cardId: string; domain: string }[]
): SessionState {
  return {
    ...state,
    piles: state.piles.map((pile) => {
      const refsForPile = refs.filter((ref) => ref.domain === pile.domain);
      if (refsForPile.length === 0) return pile;

      const drawnIds = refsForPile.map((ref) => ref.cardId);
      return {
        ...pile,
        currentOrder: pile.currentOrder.filter((cardId) => !drawnIds.includes(cardId)),
        drawnCardIds: [
          ...pile.drawnCardIds,
          ...drawnIds.filter((cardId) => !pile.drawnCardIds.includes(cardId))
        ]
      };
    })
  };
}

function createNote(state: SessionState, action: Extract<DeckAction, { type: "note.create" }>) {
  const note: NoteObject = {
    id: makeNoteId(),
    type: "note",
    x: action.x ?? TABLEAU_CENTER.x + 170 + (state.notes.length % 5) * 28,
    y: action.y ?? TABLEAU_CENTER.y - 80 + (state.notes.length % 5) * 24,
    text: action.text ?? "",
    noteKind: action.noteKind ?? "free",
    attachedTo: action.attachedTo
  };

  return appendSessionLog({
    ...state,
    notes: [...state.notes, note],
    selectedInstanceId: null,
    selectedNoteId: note.id,
    selectedArrowId: null
  }, {
    actionType: "note.create",
    label: "Created note",
    details: { noteId: note.id, noteKind: note.noteKind }
  });
}

function touchSession(state: SessionState): SessionState {
  return {
    ...state,
    updatedAt: new Date().toISOString()
  };
}

function actionNow(action: { now?: string }) {
  return action.now ?? new Date().toISOString();
}

export function sessionReducer(state: SessionState, action: DeckAction): SessionState {
  switch (action.type) {
    case "card.place":
      return placeCardWithLog(
        state,
        action.cardId,
        action.x,
        action.y,
        action.displayMode,
        action.face,
        action.scale,
        action.hidden,
        action.orientation
      );

    case "card.placeHidden":
      return placeCardWithLog(
        state,
        action.cardId,
        action.x,
        action.y,
        action.displayMode,
        action.face,
        action.scale,
        true,
        action.orientation
      );

    case "script.placeSpecificCard": {
      const stateWithDrawn = {
        ...state,
        piles: state.piles.map((pile) => {
          const belongsToPile = action.domain
            ? pile.domain === action.domain
            : pile.currentOrder.includes(action.cardId) || pile.cardIds.includes(action.cardId);
          if (!belongsToPile) return pile;
          return {
            ...pile,
            currentOrder: pile.currentOrder.filter((cardId) => cardId !== action.cardId),
            drawnCardIds: pile.drawnCardIds.includes(action.cardId)
              ? pile.drawnCardIds
              : [...pile.drawnCardIds, action.cardId]
          };
        })
      };
      const nextState = placeCardWithLog(
        stateWithDrawn,
        action.cardId,
        action.x,
        action.y,
        action.displayMode,
        action.face,
        action.scale,
        action.hidden,
        action.orientation
      );
      return appendSessionLog(nextState, {
        actionType: "script.placeSpecificCard",
        label: action.commentary ?? "Script placed a specific card",
        cardId: action.cardId,
        domain: action.domain
      });
    }

    case "card.move":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, x: card.x + action.dx, y: card.y + action.dy }
            : card
        )
      };

    case "card.rotate":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, rotation: nextRotation(card.rotation) }
            : card
        )
      };

    case "card.selectInstance":
      return {
        ...state,
        selectedInstanceId: action.instanceId,
        selectedNoteId: null,
        selectedArrowId: null
      };

    case "card.setOrientation":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, orientation: action.orientation }
            : card
        )
      }, {
        actionType: "card.setOrientation",
        label: `Set orientation: ${action.orientation}`,
        instanceId: action.instanceId,
        details: { orientation: action.orientation }
      });

    case "card.cycleOrientation": {
      const current = state.tableau.find((card) => card.instanceId === action.instanceId);
      const orientation = current ? nextOrientation(current.orientation) : "upright";

      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, orientation }
            : card
        )
      }, {
        actionType: "card.cycleOrientation",
        label: `Set orientation: ${orientation}`,
        instanceId: action.instanceId,
        details: { orientation }
      });
    }

    case "card.setDisplayMode":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, displayMode: action.displayMode }
            : card
        )
      }, {
        actionType: "card.setDisplayMode",
        label: `Set display mode: ${action.displayMode}`,
        instanceId: action.instanceId,
        details: { displayMode: action.displayMode }
      });

    case "card.setFace":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, face: action.face } : card
        )
      };

    case "board.applyDisplayPresetToCards": {
      const nextTableau = state.tableau.map((card) => {
        if (card.hidden) return card;
        if (action.restorePrevious) {
          if (!card.previousDisplay) return card;
          return {
            ...card,
            displayMode: card.previousDisplay.displayMode,
            face: card.previousDisplay.face ?? card.face,
            previousDisplay: undefined
          };
        }

        if (!action.displayMode) return card;

        return {
          ...card,
          previousDisplay: card.previousDisplay ?? {
            displayMode: card.displayMode,
            face: card.face
          },
          displayMode: action.displayMode,
          face: action.face ?? card.face
        };
      });

      return appendSessionLog({
        ...state,
        tableau: nextTableau
      }, {
        actionType: action.restorePrevious
          ? "board.restoreDisplayPreset"
          : "board.applyDisplayPresetToCards",
        label: action.restorePrevious
          ? "Restored previous card display modes"
          : `Applied display preset to all cards: ${action.label}`
      });
    }

    case "card.toggleFace":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? {
                ...card,
                face: nextFace(card.face),
                displayMode: toggleFaceDisplayMode(card.displayMode)
              }
            : card
        )
      };

    case "card.setScale":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, scale: clampCardScale(action.scale) }
            : card
        )
      };

    case "card.increaseScale":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, scale: clampCardScale(card.scale + CARD_SCALE_STEP) }
            : card
        )
      };

    case "card.decreaseScale":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId
            ? { ...card, scale: clampCardScale(card.scale - CARD_SCALE_STEP) }
            : card
        )
      };

    case "card.resetScale":
      return {
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, scale: 1 } : card
        )
      };

    case "card.scaleAll":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) => ({
          ...card,
          scale: clampCardScale(card.scale * action.factor)
        }))
      }, {
        actionType: "card.scaleAll",
        label: action.factor >= 1 ? "Increased all card sizes" : "Decreased all card sizes",
        details: { factor: action.factor }
      });

    case "card.setAllScales":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) => ({
          ...card,
          scale: clampCardScale(action.scale)
        }))
      }, {
        actionType: "card.setAllScales",
        label: `Set all card sizes to ${clampCardScale(action.scale)}x`,
        details: { scale: clampCardScale(action.scale) }
      });

    case "card.resetAllScales":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) => ({ ...card, scale: 1 }))
      }, {
        actionType: "card.resetAllScales",
        label: "Reset all card sizes to 1x"
      });

    case "card.reveal":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, hidden: false } : card
        )
      }, {
        actionType: "card.reveal",
        label: "Revealed hidden card",
        instanceId: action.instanceId
      });

    case "card.revealAll": {
      const hiddenCount = state.tableau.filter((card) => card.hidden).length;
      if (hiddenCount === 0) return state;

      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.hidden ? { ...card, hidden: false } : card
        )
      }, {
        actionType: "card.revealAll",
        label: `Revealed ${hiddenCount} hidden card${hiddenCount === 1 ? "" : "s"}`,
        details: { hiddenCount }
      });
    }

    case "card.hide":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, hidden: true } : card
        )
      }, {
        actionType: "card.hide",
        label: "Hid card",
        instanceId: action.instanceId
      });

    case "card.toggleHidden":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, hidden: !card.hidden } : card
        )
      }, {
        actionType: "card.toggleHidden",
        label: "Toggled hidden card",
        instanceId: action.instanceId
      });

    case "card.toggleAblated": {
      const current = state.tableau.find((card) => card.instanceId === action.instanceId);
      const ablated = !current?.ablated;

      return appendSessionLog({
        ...state,
        tableau: state.tableau.map((card) =>
          card.instanceId === action.instanceId ? { ...card, ablated } : card
        )
      }, {
        actionType: "card.toggleAblated",
        label: ablated ? "Marked card as ablated" : "Restored ablated card",
        instanceId: action.instanceId,
        details: { ablated }
      });
    }

    case "card.deleteInstance":
      return appendSessionLog({
        ...state,
        tableau: state.tableau.filter((card) => card.instanceId !== action.instanceId),
        selectedInstanceId:
          state.selectedInstanceId === action.instanceId ? null : state.selectedInstanceId,
        notes: state.notes.map((note) =>
          note.attachedTo === action.instanceId ? { ...note, attachedTo: undefined } : note
        )
      }, {
        actionType: "card.deleteInstance",
        label: "Deleted card instance",
        instanceId: action.instanceId
      });

    case "card.deleteInstanceToDiscard": {
      const instance = state.tableau.find((card) => card.instanceId === action.instanceId);
      if (!instance) return state;

      return appendSessionLog({
        ...state,
        tableau: state.tableau.filter((card) => card.instanceId !== action.instanceId),
        selectedInstanceId:
          state.selectedInstanceId === action.instanceId ? null : state.selectedInstanceId,
        notes: state.notes.map((note) =>
          note.attachedTo === action.instanceId ? { ...note, attachedTo: undefined } : note
        ),
        piles: state.piles.map((pile) =>
          pile.domain === action.domain ? addCardToDiscard(pile, instance.cardId) : pile
        )
      }, {
        actionType: "card.deleteInstanceToDiscard",
        label: "Moved card to discard",
        cardId: instance.cardId,
        instanceId: action.instanceId,
        domain: action.domain
      });
    }

    case "note.create":
      return createNote(state, action);

    case "note.select":
      return {
        ...state,
        selectedInstanceId: null,
        selectedNoteId: action.noteId,
        selectedArrowId: null
      };

    case "note.updateText":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, text: action.text } : note
        )
      };

    case "note.move":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId
            ? { ...note, x: note.x + action.dx, y: note.y + action.dy }
            : note
        )
      };

    case "note.setKind":
      return appendSessionLog({
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, noteKind: action.noteKind } : note
        )
      }, {
        actionType: "note.setKind",
        label: `Set note kind: ${action.noteKind}`,
        details: { noteId: action.noteId, noteKind: action.noteKind }
      });

    case "note.attachToObject":
      return {
        ...state,
        notes: state.notes.map((note) =>
          note.id === action.noteId ? { ...note, attachedTo: action.attachedTo } : note
        )
      };

    case "note.delete":
      return appendSessionLog({
        ...state,
        notes: state.notes.filter((note) => note.id !== action.noteId),
        selectedNoteId: state.selectedNoteId === action.noteId ? null : state.selectedNoteId
      }, {
        actionType: "note.delete",
        label: "Deleted note",
        details: { noteId: action.noteId }
      });

    case "arrow.create": {
      const arrow = {
        id: makeArrowId(),
        type: "arrow" as const,
        x1: action.x1 ?? TABLEAU_CENTER.x - 160,
        y1: action.y1 ?? TABLEAU_CENTER.y,
        x2: action.x2 ?? TABLEAU_CENTER.x + 160,
        y2: action.y2 ?? TABLEAU_CENTER.y,
        label: action.label ?? "",
        strokeWidth: 4
      };

      return appendSessionLog({
        ...state,
        arrows: [...state.arrows, arrow],
        selectedInstanceId: null,
        selectedNoteId: null,
        selectedArrowId: arrow.id
      }, {
        actionType: "arrow.create",
        label: "Created arrow",
        details: { arrowId: arrow.id }
      });
    }

    case "arrow.select":
      return {
        ...state,
        selectedInstanceId: null,
        selectedNoteId: null,
        selectedArrowId: action.arrowId
      };

    case "arrow.moveEndpoint":
      return {
        ...state,
        arrows: state.arrows.map((arrow) => {
          if (arrow.id !== action.arrowId) return arrow;
          return action.endpoint === "start"
            ? { ...arrow, x1: arrow.x1 + action.dx, y1: arrow.y1 + action.dy }
            : { ...arrow, x2: arrow.x2 + action.dx, y2: arrow.y2 + action.dy };
        })
      };

    case "arrow.move":
      return {
        ...state,
        arrows: state.arrows.map((arrow) =>
          arrow.id === action.arrowId
            ? {
                ...arrow,
                x1: arrow.x1 + action.dx,
                y1: arrow.y1 + action.dy,
                x2: arrow.x2 + action.dx,
                y2: arrow.y2 + action.dy
              }
            : arrow
        )
      };

    case "arrow.update":
      return {
        ...state,
        arrows: state.arrows.map((arrow) =>
          arrow.id === action.arrowId ? { ...arrow, ...action.patch } : arrow
        )
      };

    case "arrow.delete":
      return appendSessionLog({
        ...state,
        arrows: state.arrows.filter((arrow) => arrow.id !== action.arrowId),
        selectedArrowId: state.selectedArrowId === action.arrowId ? null : state.selectedArrowId
      }, {
        actionType: "arrow.delete",
        label: "Deleted arrow",
        details: { arrowId: action.arrowId }
      });

    case "piles.initialize":
      return {
        ...state,
        piles:
          state.piles.length > 0
            ? mergeDomainPiles(action.cards, state.piles)
            : createDomainPiles(action.cards)
      };

    case "pile.discardCard":
      return {
        ...state,
        piles: state.piles.map((pile) =>
          pile.domain === action.domain ? addCardToDiscard(pile, action.cardId) : pile
        )
      };

    case "pile.drawRandom": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile) return state;
      const { pile: nextPile, cardId } = drawFromPile(pile);
      if (!cardId) return state;
      return appendSessionLog(placeDrawnCard(
        {
          ...state,
          piles: state.piles.map((candidate) => (candidate.id === pile.id ? nextPile : candidate))
        },
        cardId,
        action.domain,
        action.hidden === true,
        action.displayMode,
        action.face,
        action.scale
      ), {
        actionType: action.hidden ? "pile.drawSecret" : "pile.drawRandom",
        label: action.hidden ? `Drew secret ${action.domain} card` : `Drew ${action.domain} card`,
        cardId,
        domain: action.domain
      });
    }

    case "pile.drawMany": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile) return state;
      const { pile: nextPile, cardIds } = drawManyFromPile(pile, action.count);
      let nextState: SessionState = {
        ...state,
        piles: state.piles.map((candidate) => (candidate.id === pile.id ? nextPile : candidate))
      };
      cardIds.forEach((cardId) => {
          nextState = placeDrawnCard(
          nextState,
          cardId,
          action.domain,
          action.hidden === true,
          action.displayMode,
          action.face,
          action.scale
        );
      });
      return appendSessionLog(nextState, {
        actionType: action.hidden ? "pile.drawManySecret" : "pile.drawMany",
        label: action.hidden
          ? `Drew ${cardIds.length} secret ${action.domain} cards`
          : `Drew ${cardIds.length} ${action.domain} cards`,
        domain: action.domain,
        details: { cardIds }
      });
    }

    case "pile.drawCandidates": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile) return state;
      const { pile: nextPile, cardIds } = drawManyFromPile(pile, action.count);
      if (cardIds.length === 0) return state;
      return appendSessionLog({
        ...state,
        piles: state.piles.map((candidate) => (candidate.id === pile.id ? nextPile : candidate)),
        pendingDrawChoice: {
          domain: action.domain,
          cardIds,
          advanceCycle: action.advanceCycle,
          displayMode: action.displayMode,
          face: action.face,
          scale: action.scale
        }
      }, {
        actionType: "pile.drawCandidates",
        label: `Drew ${cardIds.length} ${action.domain} candidates`,
        domain: action.domain,
        details: { cardIds }
      });
    }

    case "pile.drawSpecificCard": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile) return state;

      const { pile: nextPile, cardId } = drawSpecificCardFromPile(pile, action.cardId);
      if (!cardId) return state;

      return appendSessionLog(placeDrawnCard(
        {
          ...state,
          piles: state.piles.map((candidate) => (candidate.id === pile.id ? nextPile : candidate))
        },
        cardId,
        action.domain,
        action.hidden === true,
        action.displayMode,
        action.face,
        action.scale
      ), {
        actionType: action.hidden ? "pile.drawSpecificCardHidden" : "pile.drawSpecificCard",
        label: action.hidden ? "Drew specific card hidden" : "Drew specific card",
        cardId,
        domain: action.domain
      });
    }

    case "pile.chooseCandidate": {
      const pending = state.pendingDrawChoice;
      if (!pending || !pending.cardIds.includes(action.cardId)) return state;
      const unchosen = pending.cardIds.filter((cardId) => cardId !== action.cardId);
      const chosenDomain = pending.cardDomains?.[action.cardId] ?? pending.domain;
      const stateWithDiscard = {
        ...state,
        pendingDrawChoice: null,
        drawCycle: pending.advanceCycle
          ? advanceDrawCycle(state.drawCycle)
          : state.drawCycle,
        piles: state.piles.map((pile) => {
          const unchosenForPile = unchosen.filter(
            (cardId) => (pending.cardDomains?.[cardId] ?? pending.domain) === pile.domain
          );
          return unchosenForPile.reduce((nextPile, cardId) => addCardToDiscard(nextPile, cardId), pile);
        })
      };
      return appendSessionLog(placeDrawnCard(
        stateWithDiscard,
        action.cardId,
        chosenDomain,
        false,
        pending.displayMode,
        pending.face,
        pending.scale
      ), {
        actionType: "pile.chooseCandidate",
        label: `Chose 1 from ${pending.cardIds.length}`,
        cardId: action.cardId,
        domain: chosenDomain,
        details: { chosenCardId: action.cardId, discardedCardIds: unchosen }
      });
    }

    case "pile.cancelCandidateChoice": {
      const pending = state.pendingDrawChoice;
      if (!pending) return state;
      // Cancel returns all drawn candidates to the top of their draw pile in original candidate order.
      return {
        ...state,
        pendingDrawChoice: null,
        piles: state.piles.map((pile) =>
          pending.cardIds.some(
            (cardId) => (pending.cardDomains?.[cardId] ?? pending.domain) === pile.domain
          )
            ? {
                ...pile,
                drawnCardIds: pile.drawnCardIds.filter((cardId) => !pending.cardIds.includes(cardId)),
                currentOrder: [
                  ...pending.cardIds.filter(
                    (cardId) => (pending.cardDomains?.[cardId] ?? pending.domain) === pile.domain
                  ),
                  ...pile.currentOrder
                ]
              }
            : pile
        )
      };
    }

    case "draw.placeFilteredCards": {
      const stateWithDrawn = markFilteredCardsDrawn(state, action.cards);
      const nextState = action.cards.reduce(
        (nextState, ref) => placeDrawnCard(
          nextState,
          ref.cardId,
          ref.domain,
          action.hidden === true,
          action.displayMode,
          action.face,
          action.scale
        ),
        stateWithDrawn
      );
      return appendSessionLog(nextState, {
        actionType: action.logActionType ?? (action.hidden ? "draw.placeFilteredCardsSecret" : "draw.placeFilteredCards"),
        label: action.logLabel ?? (action.hidden
          ? `Drew ${action.cards.length} filtered secret cards`
          : `Drew ${action.cards.length} filtered cards`),
        details: { cards: action.cards }
      });
    }

    case "draw.startFilteredChoice": {
      if (action.cards.length === 0) return state;
      const stateWithDrawn = markFilteredCardsDrawn(state, action.cards);
      return appendSessionLog({
        ...stateWithDrawn,
        pendingDrawChoice: {
          domain: action.cards[0]?.domain ?? "Mixed",
          cardIds: action.cards.map((card) => card.cardId),
          cardDomains: Object.fromEntries(action.cards.map((card) => [card.cardId, card.domain])),
          displayMode: action.displayMode,
          face: action.face,
          scale: action.scale
        }
      }, {
        actionType: "draw.startFilteredChoice",
        label: `Drew ${action.cards.length} filtered candidates`,
        details: { cards: action.cards }
      });
    }

    case "pile.playFromDiscard": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile || !pile.discardCardIds.includes(action.cardId)) return state;

      return appendSessionLog(placeDrawnCard(
        {
          ...state,
          piles: state.piles.map((candidate) =>
            candidate.id === pile.id ? playCardFromDiscard(candidate, action.cardId) : candidate
          )
        },
        action.cardId,
        action.domain,
        false,
        action.displayMode,
        action.face,
        action.scale
      ), {
        actionType: "pile.playFromDiscard",
        label: "Played card from discard",
        cardId: action.cardId,
        domain: action.domain
      });
    }

    case "pile.returnDiscardToPile":
      return appendSessionLog({
        ...state,
        piles: state.piles.map((pile) =>
          pile.domain === action.domain ? returnDiscardCardToPile(pile, action.cardId) : pile
        )
      }, {
        actionType: "pile.returnDiscardToPile",
        label: "Returned discarded card to pile",
        cardId: action.cardId,
        domain: action.domain
      });

    case "pile.returnAllDiscardsToPile":
      return appendSessionLog({
        ...state,
        piles: state.piles.map((pile) =>
          pile.domain === action.domain ? returnAllDiscardsToPile(pile) : pile
        )
      }, {
        actionType: "pile.returnAllDiscardsToPile",
        label: "Returned all discards to pile",
        domain: action.domain
      });

    case "pile.shuffle":
      return appendSessionLog({
        ...state,
        piles: state.piles.map((pile) =>
          pile.domain === action.domain ? shufflePile(pile) : pile
        )
      }, {
        actionType: "pile.shuffle",
        label: "Shuffled pile",
        domain: action.domain
      });

    case "piles.drawDomain": {
      const pile = state.piles.find((candidate) => candidate.domain === action.domain);
      if (!pile) return state;

      const { pile: nextPile, cardId } = drawFromPile(pile);
      if (!cardId) return state;

      const stateWithDrawnPile = {
        ...state,
        piles: state.piles.map((candidate) =>
          candidate.id === nextPile.id ? nextPile : candidate
        ),
        drawCycle: action.advanceCycle
          ? advanceDrawCycle(state.drawCycle)
          : state.drawCycle
      };

      return appendSessionLog(placeDrawnCard(
        stateWithDrawnPile,
        cardId,
        action.domain,
        action.hidden === true,
        action.displayMode,
        action.face,
        action.scale
      ), {
        actionType: "piles.drawDomain",
        label: action.advanceCycle
          ? action.hidden
            ? `Drew hidden next in cycle: ${action.domain}`
            : `Drew next in cycle: ${action.domain}`
          : action.hidden
            ? `Drew hidden ${action.domain} card`
            : `Drew ${action.domain} card`,
        cardId,
        domain: action.domain
      });
    }

    case "mode.setActive":
      return {
        ...state,
        activeModeId: action.modeId ?? DEFAULT_MODE_ID
      };

    case "mode.setEnforcement":
      return {
        ...state,
        modeEnforcement: action.enforcement
      };

    case "mode.updateProgress":
      return {
        ...state,
        modeProgress: {
          ...state.modeProgress,
          [action.modeId]: {
            ...(state.modeProgress[action.modeId] ?? {}),
            ...action.patch
          }
        }
      };

    case "timer.configure":
      return {
        ...state,
        timer: {
          ...state.timer,
          ...action.patch,
          durationMs:
            action.patch.durationMs === undefined
              ? state.timer.durationMs
              : Math.max(0, action.patch.durationMs),
          restartDelayMs:
            action.patch.restartDelayMs === undefined
              ? state.timer.restartDelayMs
              : Math.max(0, action.patch.restartDelayMs)
        }
      };

    case "timer.start": {
      const now = actionNow(action);
      return appendSessionLog({
        ...state,
        timer: {
          ...state.timer,
          status: "running",
          startedAt: now,
          pausedAt: undefined,
          accumulatedMs: 0,
          lastFinishedAt: undefined
        }
      }, {
        actionType: "timer.start",
        label: state.timer.mode === "countdown" ? "Started countdown timer" : "Started stopwatch"
      });
    }

    case "timer.pause": {
      if (state.timer.status !== "running") return state;
      const now = actionNow(action);
      return appendSessionLog({
        ...state,
        timer: {
          ...state.timer,
          status: "paused",
          pausedAt: now,
          startedAt: undefined,
          accumulatedMs: computeElapsedMs(state.timer, Date.parse(now))
        }
      }, {
        actionType: "timer.pause",
        label: "Paused timer"
      });
    }

    case "timer.resume": {
      if (state.timer.status !== "paused") return state;
      const now = actionNow(action);
      return appendSessionLog({
        ...state,
        timer: {
          ...state.timer,
          status: "running",
          startedAt: now,
          pausedAt: undefined,
          lastFinishedAt: undefined
        }
      }, {
        actionType: "timer.resume",
        label: "Resumed timer"
      });
    }

    case "timer.stop":
      return {
        ...state,
        timer: {
          ...state.timer,
          status: "idle",
          startedAt: undefined,
          pausedAt: undefined,
          accumulatedMs: 0,
          lastFinishedAt: undefined
        }
      };

    case "timer.reset":
      return {
        ...state,
        timer: {
          ...state.timer,
          status: "idle",
          startedAt: undefined,
          pausedAt: undefined,
          accumulatedMs: 0,
          lastFinishedAt: undefined
        }
      };

    case "timer.finish": {
      const now = actionNow(action);
      if (state.timer.status === "finished" && state.timer.lastFinishedAt) return state;
      return appendSessionLog({
        ...state,
        timer: {
          ...state.timer,
          status: "finished",
          startedAt: undefined,
          pausedAt: undefined,
          accumulatedMs: state.timer.durationMs ?? state.timer.accumulatedMs,
          lastFinishedAt: now
        }
      }, {
        actionType: "timer.finish",
        label: "Timer finished",
        details: {
          actionOnFinish: state.timer.actionOnFinish
        }
      });
    }

    case "timer.restart": {
      const now = actionNow(action);
      return {
        ...state,
        timer: {
          ...state.timer,
          status: "running",
          startedAt: now,
          pausedAt: undefined,
          accumulatedMs: 0,
          lastFinishedAt: undefined
        }
      };
    }

    case "session.rename":
      return touchSession({
        ...state,
        title: action.title
      });

    case "session.updateMetadata":
      return touchSession({
        ...state,
        ...action.metadata
      });

    case "session.updateSynthesis":
      return touchSession({
        ...state,
        synthesis: {
          ...state.synthesis,
          ...action.synthesis
        }
      });

    case "session.updateConclusion":
      return touchSession({
        ...state,
        conclusion: action.conclusion
      });

    case "session.updateNextMove":
      return touchSession({
        ...state,
        nextMove: action.nextMove
      });

    case "session.clear":
      return {
        ...state,
        tableau: [],
        notes: [],
        arrows: [],
        log: [],
        selectedInstanceId: null,
        selectedNoteId: null,
        selectedArrowId: null,
        piles: resetPiles(state.piles),
        drawCycle: {
          ...state.drawCycle,
          index: 0
        },
        timer: DEFAULT_CLEARED_TIMER
      };

    case "session.clearLog":
      return {
        ...state,
        log: []
      };

    case "session.addLog":
      return appendSessionLog(state, {
        actionType: action.actionType,
        label: action.label,
        details: action.details
      });

    case "session.loadTableau":
      return {
        ...state,
        tableau: action.tableau,
        notes: action.notes ?? state.notes,
        arrows: state.arrows,
        selectedInstanceId: null,
        selectedNoteId: null,
        selectedArrowId: null,
        piles: action.piles ?? state.piles
      };

    case "session.load":
      return action.session;
  }
}
