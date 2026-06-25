import type { CardDisplayMode, CardFace } from "./view";
import type { ModeEnforcement } from "./mode";
import type { DeckCard } from "./card";
import type {
  CardInstance,
  ArrowObject,
  NoteKind,
  NoteObject,
  Orientation,
  Pile,
  SessionState,
  SessionSynthesis,
  TimerActionOnFinish,
  TimerMode
} from "./session";

export type DeckAction =
  | {
      type: "card.place";
      cardId: string;
      x?: number;
      y?: number;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
      hidden?: boolean;
      orientation?: Orientation;
    }
  | {
      type: "card.placeHidden";
      cardId: string;
      x?: number;
      y?: number;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
      orientation?: Orientation;
    }
  | {
      type: "script.placeSpecificCard";
      cardId: string;
      domain?: string;
      x: number;
      y: number;
      orientation: Orientation;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
      hidden?: boolean;
      commentary?: string;
    }
  | {
      type: "card.move";
      instanceId: string;
      dx: number;
      dy: number;
    }
  | {
      type: "card.rotate";
      instanceId: string;
    }
  | {
      type: "card.selectInstance";
      instanceId: string | null;
    }
  | {
      type: "card.setOrientation";
      instanceId: string;
      orientation: Orientation;
    }
  | {
      type: "card.cycleOrientation";
      instanceId: string;
    }
  | {
      type: "card.setDisplayMode";
      instanceId: string;
      displayMode: CardDisplayMode;
    }
  | {
      type: "card.setFace";
      instanceId: string;
      face: CardFace;
    }
  | {
      type: "board.applyDisplayPresetToCards";
      displayMode?: CardDisplayMode;
      face?: CardFace;
      label: string;
      restorePrevious?: boolean;
    }
  | {
      type: "card.toggleFace";
      instanceId: string;
    }
  | {
      type: "card.setScale";
      instanceId: string;
      scale: number;
    }
  | {
      type: "card.increaseScale";
      instanceId: string;
    }
  | {
      type: "card.decreaseScale";
      instanceId: string;
    }
  | {
      type: "card.resetScale";
      instanceId: string;
    }
  | {
      type: "card.scaleAll";
      factor: number;
    }
  | {
      type: "card.setAllScales";
      scale: number;
    }
  | {
      type: "card.resetAllScales";
    }
  | {
      type: "card.deleteInstance";
      instanceId: string;
    }
  | {
      type: "card.reveal";
      instanceId: string;
    }
  | {
      type: "card.revealAll";
    }
  | {
      type: "card.hide";
      instanceId: string;
    }
  | {
      type: "card.toggleHidden";
      instanceId: string;
    }
  | {
      type: "card.toggleAblated";
      instanceId: string;
    }
  | {
      type: "card.deleteInstanceToDiscard";
      instanceId: string;
      domain: string;
    }
  | {
      type: "note.create";
      x?: number;
      y?: number;
      text?: string;
      noteKind?: NoteKind;
      attachedTo?: string;
    }
  | {
      type: "note.select";
      noteId: string | null;
    }
  | {
      type: "note.updateText";
      noteId: string;
      text: string;
    }
  | {
      type: "note.move";
      noteId: string;
      dx: number;
      dy: number;
    }
  | {
      type: "note.setKind";
      noteId: string;
      noteKind: NoteKind;
    }
  | {
      type: "note.attachToObject";
      noteId: string;
      attachedTo?: string;
    }
  | {
      type: "note.delete";
      noteId: string;
    }
  | {
      type: "arrow.create";
      x1?: number;
      y1?: number;
      x2?: number;
      y2?: number;
      label?: string;
    }
  | {
      type: "arrow.select";
      arrowId: string | null;
    }
  | {
      type: "arrow.moveEndpoint";
      arrowId: string;
      endpoint: "start" | "end";
      dx: number;
      dy: number;
    }
  | {
      type: "arrow.move";
      arrowId: string;
      dx: number;
      dy: number;
    }
  | {
      type: "arrow.update";
      arrowId: string;
      patch: Partial<Pick<ArrowObject, "label" | "strokeWidth">>;
    }
  | {
      type: "arrow.delete";
      arrowId: string;
    }
  | {
      type: "piles.initialize";
      cards: DeckCard[];
    }
  | {
      type: "piles.drawDomain";
      domain: string;
      advanceCycle?: boolean;
      hidden?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.drawRandom";
      domain: string;
      hidden?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.drawMany";
      domain: string;
      count: number;
      hidden?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.drawCandidates";
      domain: string;
      count: number;
      advanceCycle?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.drawSpecificCard";
      domain: string;
      cardId: string;
      hidden?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.chooseCandidate";
      cardId: string;
    }
  | {
      type: "pile.cancelCandidateChoice";
    }
  | {
      type: "draw.placeFilteredCards";
      cards: { cardId: string; domain: string; modeRole?: string }[];
      hidden?: boolean;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
      logLabel?: string;
      logActionType?: string;
    }
  | {
      type: "draw.startFilteredChoice";
      cards: { cardId: string; domain: string }[];
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.discardCard";
      domain: string;
      cardId: string;
    }
  | {
      type: "pile.playFromDiscard";
      domain: string;
      cardId: string;
      displayMode?: CardDisplayMode;
      face?: CardFace;
      scale?: number;
    }
  | {
      type: "pile.returnDiscardToPile";
      domain: string;
      cardId: string;
    }
  | {
      type: "pile.returnAllDiscardsToPile";
      domain: string;
    }
  | {
      type: "pile.shuffle";
      domain: string;
    }
  | {
      type: "mode.setActive";
      modeId?: string;
    }
  | {
      type: "mode.setEnforcement";
      enforcement: ModeEnforcement;
    }
  | {
      type: "mode.updateProgress";
      modeId: string;
      patch: Record<string, unknown>;
    }
  | {
      type: "timer.configure";
      patch: {
        mode?: TimerMode;
        durationMs?: number;
        messageOnFinish?: string;
        actionOnFinish?: TimerActionOnFinish;
        autoRestart?: boolean;
        restartDelayMs?: number;
      };
    }
  | {
      type: "timer.start";
      now?: string;
    }
  | {
      type: "timer.pause";
      now?: string;
    }
  | {
      type: "timer.resume";
      now?: string;
    }
  | {
      type: "timer.stop";
    }
  | {
      type: "timer.reset";
    }
  | {
      type: "timer.finish";
      now?: string;
    }
  | {
      type: "timer.restart";
      now?: string;
    }
  | {
      type: "session.clear";
    }
  | {
      type: "session.clearLog";
    }
  | {
      type: "session.addLog";
      actionType: string;
      label: string;
      details?: Record<string, unknown>;
    }
  | {
      type: "session.rename";
      title: string;
    }
  | {
      type: "session.updateMetadata";
      metadata: {
        title?: string;
        question?: string;
        context?: string;
      };
    }
  | {
      type: "session.updateSynthesis";
      synthesis: Partial<SessionSynthesis>;
    }
  | {
      type: "session.updateConclusion";
      conclusion: string;
    }
  | {
      type: "session.updateNextMove";
      nextMove: string;
    }
  | {
      type: "session.loadTableau";
      tableau: CardInstance[];
      notes?: NoteObject[];
      piles?: Pile[];
    }
  | {
      type: "session.load";
      session: SessionState;
    };
