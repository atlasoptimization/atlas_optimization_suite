import type { CardDisplayMode, CardFace } from "../core/types/view";
import type { ModeEnforcement } from "../core/types/mode";
import type { CustomCard } from "../core/types/card";
import type { CustomDomainSpec } from "../core/types/customDomain";
import type {
  CardInstance,
  CardRotation,
  ArrowObject,
  DrawCycle,
  NoteKind,
  NoteObject,
  Orientation,
  Pile,
  SessionLogEntry,
  SessionState,
  SessionSynthesis,
  TimerActionOnFinish,
  TimerMode,
  TimerState,
  TimerStatus
} from "../core/types/session";
import type { SessionExportJson } from "../core/types/sessionExport";
import { DOMAIN_ORDER } from "../core/constants/domains";
import { createSession } from "../engine/createSession";
import { DEFAULT_MODE_ID } from "../modes/constants";
import { normalizeCustomCard } from "./localCustomCardsStorage";
import { parseCustomDomainSpecJson } from "../customDomains/customDomainSpec";

const orientations: Orientation[] = ["upright", "reversed", "modifier", "question"];
const displayModes: CardDisplayMode[] = [
  "full-card-image",
  "pdf-front",
  "pdf-back",
  "pdf-both",
  "card-face",
  "card-face-and-active-effect",
  "compact-name",
  "scientific-twin",
  "active-effect",
  "question",
  "flavor-text",
  "text-card"
];
const faces: CardFace[] = ["front", "back", "both"];
const rotations: CardRotation[] = [0, 90, 180, 270];
const noteKinds: NoteKind[] = ["free", "insight", "problem", "opportunity", "action", "question"];
const modeEnforcements: ModeEnforcement[] = ["free", "guided", "strict"];
const timerModes: TimerMode[] = ["stopwatch", "countdown"];
const timerStatuses: TimerStatus[] = ["idle", "running", "paused", "finished"];
const timerFinishActions: TimerActionOnFinish[] = [
  "none",
  "show-message",
  "next",
  "ask-before-next",
  "draw-next",
  "open-draw-next-confirmation"
];

function normalizeTimerFinishAction(value: unknown, fallback: TimerActionOnFinish): TimerActionOnFinish {
  if (value === "draw-next") return "next";
  if (value === "open-draw-next-confirmation") return "ask-before-next";
  return timerFinishActions.includes(value as TimerActionOnFinish)
    ? (value as TimerActionOnFinish)
    : fallback;
}

export type ImportSessionJsonResult = {
  session: SessionState;
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeModeId(value: unknown, fallback = DEFAULT_MODE_ID) {
  if (value === "reverse-auction") return DEFAULT_MODE_ID;
  return typeof value === "string" ? value : fallback;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function normalizeScale(value: unknown) {
  return Math.min(3, Math.max(0.4, numberField(value, 1)));
}

function normalizeTimerState(value: unknown, fallback: TimerState): TimerState {
  if (!isRecord(value)) return fallback;

  return {
    visible: value.visible === true,
    mode: timerModes.includes(value.mode as TimerMode) ? (value.mode as TimerMode) : fallback.mode,
    status: timerStatuses.includes(value.status as TimerStatus)
      ? (value.status as TimerStatus)
      : fallback.status,
    startedAt: typeof value.startedAt === "string" ? value.startedAt : undefined,
    pausedAt: typeof value.pausedAt === "string" ? value.pausedAt : undefined,
    accumulatedMs: numberField(value.accumulatedMs, fallback.accumulatedMs),
    durationMs: numberField(value.durationMs, fallback.durationMs),
    messageOnFinish: stringField(value.messageOnFinish, fallback.messageOnFinish),
    actionOnFinish: normalizeTimerFinishAction(value.actionOnFinish, fallback.actionOnFinish),
    autoRestart: value.autoRestart === true,
    restartDelayMs: typeof value.restartDelayMs === "number" ? Math.max(0, value.restartDelayMs) : undefined,
    lastFinishedAt: typeof value.lastFinishedAt === "string" ? value.lastFinishedAt : undefined
  };
}

function normalizeCardInstance(value: unknown): CardInstance | null {
  if (!isRecord(value)) return null;

  const instanceId = stringField(value.instanceId);
  const cardId = stringField(value.cardId);
  if (!instanceId || !cardId) return null;
  const displayMode = displayModes.includes(value.displayMode as CardDisplayMode)
    ? (value.displayMode as CardDisplayMode)
    : "full-card-image";
  const face = faces.includes(value.face as CardFace) ? (value.face as CardFace) : "front";
  const previousDisplay = isRecord(value.previousDisplay)
    ? {
        displayMode: displayModes.includes(value.previousDisplay.displayMode as CardDisplayMode)
          ? (value.previousDisplay.displayMode as CardDisplayMode)
          : displayMode,
        face: faces.includes(value.previousDisplay.face as CardFace)
          ? (value.previousDisplay.face as CardFace)
          : face
      }
    : undefined;

  return {
    instanceId,
    cardId,
    x: numberField(value.x),
    y: numberField(value.y),
    rotation: rotations.includes(value.rotation as CardRotation)
      ? (value.rotation as CardRotation)
      : 0,
    orientation: orientations.includes(value.orientation as Orientation)
      ? (value.orientation as Orientation)
      : "upright",
    displayMode,
    face,
    scale: normalizeScale(value.scale),
    hidden: value.hidden === true,
    ablated: value.ablated === true,
    previousDisplay
  };
}

function normalizeNoteObject(value: unknown): NoteObject | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  if (!id) return null;

  return {
    id,
    type: "note",
    x: numberField(value.x),
    y: numberField(value.y),
    text: stringField(value.text),
    noteKind: noteKinds.includes((value.noteKind === "counter-reading" ? "problem" : value.noteKind) as NoteKind)
      ? ((value.noteKind === "counter-reading" ? "problem" : value.noteKind) as NoteKind)
      : "free",
    attachedTo: typeof value.attachedTo === "string" ? value.attachedTo : undefined
  };
}

function normalizeArrowObject(value: unknown): ArrowObject | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  if (!id) return null;

  return {
    id,
    type: "arrow",
    x1: numberField(value.x1),
    y1: numberField(value.y1),
    x2: numberField(value.x2, 160),
    y2: numberField(value.y2),
    label: stringField(value.label),
    strokeWidth: numberField(value.strokeWidth, 4)
  };
}

function normalizePile(value: unknown): Pile | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  const name = stringField(value.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    domain: typeof value.domain === "string" ? value.domain : undefined,
    cardIds: stringArray(value.cardIds),
    currentOrder: stringArray(value.currentOrder),
    drawnCardIds: stringArray(value.drawnCardIds),
    discardCardIds: stringArray(value.discardCardIds),
    shuffleSeed: typeof value.shuffleSeed === "string" ? value.shuffleSeed : undefined
  };
}

function normalizeDrawCycle(value: unknown): DrawCycle {
  if (!isRecord(value)) {
    return {
      order: [...DOMAIN_ORDER],
      index: 0
    };
  }

  const order = stringArray(value.order);
  return {
    order: order.length > 0 ? order : [...DOMAIN_ORDER],
    index: Math.max(0, Math.floor(numberField(value.index)))
  };
}

function normalizeSynthesis(value: unknown): SessionSynthesis {
  if (!isRecord(value)) {
    return {
      expected: "",
      surprise: "",
      noteworthy: "",
      insight: ""
    };
  }

  return {
    expected: stringField(value.expected),
    surprise: stringField(value.surprise),
    noteworthy: stringField(value.noteworthy),
    insight: stringField(value.insight)
  };
}

function normalizeModeProgress(value: unknown) {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, Record<string, unknown>] =>
      typeof entry[0] === "string" && isRecord(entry[1])
    )
  );
}

function normalizeLogEntry(value: unknown): SessionLogEntry | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  const timestamp = stringField(value.timestamp);
  const actionType = stringField(value.actionType);
  const label = stringField(value.label);
  if (!id || !timestamp || !actionType || !label) return null;

  return {
    id,
    timestamp,
    actionType,
    label,
    cardId: typeof value.cardId === "string" ? value.cardId : undefined,
    instanceId: typeof value.instanceId === "string" ? value.instanceId : undefined,
    domain: typeof value.domain === "string" ? value.domain : undefined,
    details: isRecord(value.details) ? value.details : undefined
  };
}

function normalizeSession(value: unknown): ImportSessionJsonResult {
  const fallback = createSession();
  const warnings: string[] = [];

  if (!isRecord(value)) {
    warnings.push("Imported session was not an object. A blank session was loaded.");
    return { session: fallback, warnings };
  }

  const rawTableau = Array.isArray(value.tableau) ? value.tableau : [];
  const rawNotes = Array.isArray(value.notes) ? value.notes : [];
  const rawArrows = Array.isArray(value.arrows) ? value.arrows : [];
  const rawPiles = Array.isArray(value.piles) ? value.piles : [];
  const rawLog = Array.isArray(value.log) ? value.log : [];
  const rawCustomCards = Array.isArray(value.customCards) ? value.customCards : [];
  const rawCustomDomains = Array.isArray(value.customDomains) ? value.customDomains : [];
  const tableau = rawTableau
    .map((entry) => normalizeCardInstance(entry))
    .filter((entry): entry is CardInstance => entry !== null);
  const notes = rawNotes
    .map((entry) => normalizeNoteObject(entry))
    .filter((entry): entry is NoteObject => entry !== null);
  const arrows = rawArrows
    .map((entry) => normalizeArrowObject(entry))
    .filter((entry): entry is ArrowObject => entry !== null);
  const piles = rawPiles
    .map((entry) => normalizePile(entry))
    .filter((entry): entry is Pile => entry !== null);
  const log = rawLog
    .map((entry) => normalizeLogEntry(entry))
    .filter((entry): entry is SessionLogEntry => entry !== null);
  const customCards = rawCustomCards
    .map((entry) => normalizeCustomCard(entry))
    .filter((entry): entry is CustomCard => entry !== null);
  const customDomains = rawCustomDomains
    .map((entry) => {
      try {
        return parseCustomDomainSpecJson(JSON.stringify(entry)).domain;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is CustomDomainSpec => entry !== null);
  const selectedInstanceId = stringField(value.selectedInstanceId) || null;
  const selectedNoteId = stringField(value.selectedNoteId) || null;
  const selectedArrowId = stringField(value.selectedArrowId) || null;

  if (tableau.length !== rawTableau.length) {
    warnings.push("Some invalid card instances were skipped.");
  }
  if (notes.length !== rawNotes.length) {
    warnings.push("Some invalid notes were skipped.");
  }
  if (arrows.length !== rawArrows.length) {
    warnings.push("Some invalid arrows were skipped.");
  }
  if (piles.length !== rawPiles.length) {
    warnings.push("Some invalid piles were skipped.");
  }
  if (log.length !== rawLog.length) {
    warnings.push("Some invalid log entries were skipped.");
  }
  if (customCards.length !== rawCustomCards.length) {
    warnings.push("Some invalid custom cards were skipped.");
  }
  if (customDomains.length !== rawCustomDomains.length) {
    warnings.push("Some invalid custom domains were skipped.");
  }

  return {
    session: {
      ...fallback,
      id: stringField(value.id, fallback.id),
      title: stringField(value.title, fallback.title),
      createdAt: stringField(value.createdAt, fallback.createdAt),
      updatedAt: new Date().toISOString(),
      question: stringField(value.question),
      context: stringField(value.context),
      customCards,
      customDomains,
      tableau,
      notes,
      arrows,
      log,
      selectedInstanceId: tableau.some((card) => card.instanceId === selectedInstanceId)
        ? selectedInstanceId
        : null,
      selectedNoteId: notes.some((note) => note.id === selectedNoteId) ? selectedNoteId : null,
      selectedArrowId: arrows.some((arrow) => arrow.id === selectedArrowId) ? selectedArrowId : null,
      piles,
      drawCycle: normalizeDrawCycle(value.drawCycle),
      pendingDrawChoice: null,
      activeModeId: normalizeModeId(value.activeModeId, fallback.activeModeId),
      modeEnforcement: modeEnforcements.includes(value.modeEnforcement as ModeEnforcement)
        ? (value.modeEnforcement as ModeEnforcement)
        : fallback.modeEnforcement,
      modeProgress: normalizeModeProgress(value.modeProgress),
      timer: normalizeTimerState(value.timer, fallback.timer),
      synthesis: normalizeSynthesis(value.synthesis),
      conclusion: stringField(value.conclusion),
      nextMove: stringField(value.nextMove)
    },
    warnings
  };
}

export function parseSessionJson(json: string): ImportSessionJsonResult {
  const parsed: unknown = JSON.parse(json);

  if (!isRecord(parsed)) {
    throw new Error("Session import must be a JSON object.");
  }

  if (parsed.app !== "data-science-deck-app") {
    throw new Error("This file is not a Data Science Deck session export.");
  }

  if (parsed.schemaVersion !== 1) {
    throw new Error("Unsupported session export schema version.");
  }

  return normalizeSession((parsed as SessionExportJson).session);
}
