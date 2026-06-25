import type { CardDisplayMode } from "../core/types/view";
import type { CardFace } from "../core/types/view";
import type { CustomCard } from "../core/types/card";
import type { CustomDomainSpec } from "../core/types/customDomain";
import type {
  CardInstance,
  CardRotation,
  DrawCycle,
  ArrowObject,
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
import type { ModeEnforcement } from "../core/types/mode";
import { DOMAIN_ORDER } from "../core/constants/domains";
import { DEFAULT_MODE_ID } from "../modes/constants";
import { normalizeCustomCard } from "./localCustomCardsStorage";
import { parseCustomDomainSpecJson } from "../customDomains/customDomainSpec";

const STORAGE_KEY = "dsd.session";

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

export type SavedLocalSession = Partial<
  Pick<
    SessionState,
    | "id"
    | "title"
    | "createdAt"
    | "updatedAt"
    | "question"
    | "context"
    | "activeModeId"
    | "modeEnforcement"
    | "modeProgress"
    | "synthesis"
    | "conclusion"
    | "nextMove"
    | "log"
    | "timer"
    | "customCards"
    | "customDomains"
  >
> & {
  tableau: CardInstance[];
  notes: NoteObject[];
  arrows?: ArrowObject[];
  piles?: Pile[];
  drawCycle?: DrawCycle;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeScale(value: unknown) {
  const scale = typeof value === "number" ? value : 1;
  return Math.min(3, Math.max(0.4, scale));
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeModeId(value: unknown, fallback = DEFAULT_MODE_ID) {
  if (value === "reverse-auction") return DEFAULT_MODE_ID;
  return typeof value === "string" ? value : fallback;
}

export function defaultTimerState(): TimerState {
  return {
    visible: false,
    mode: "stopwatch",
    status: "idle",
    accumulatedMs: 0,
    durationMs: 120000,
    messageOnFinish: "Next",
    actionOnFinish: "none",
    autoRestart: false
  };
}

function normalizeTimerState(value: unknown): TimerState {
  const fallback = defaultTimerState();
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

  const instanceId = typeof value.instanceId === "string" ? value.instanceId : "";
  const cardId = typeof value.cardId === "string" ? value.cardId : "";
  const x = typeof value.x === "number" ? value.x : 0;
  const y = typeof value.y === "number" ? value.y : 0;
  const rotation = rotations.includes(value.rotation as CardRotation)
    ? (value.rotation as CardRotation)
    : 0;
  const orientation = orientations.includes(value.orientation as Orientation)
    ? (value.orientation as Orientation)
    : "upright";
  const displayMode = displayModes.includes(value.displayMode as CardDisplayMode)
    ? (value.displayMode as CardDisplayMode)
    : "full-card-image";
  const face = faces.includes(value.face as CardFace) ? (value.face as CardFace) : "front";
  const scale = normalizeScale(value.scale);
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

  if (!instanceId || !cardId) return null;

  return {
    instanceId,
    cardId,
    x,
    y,
    rotation,
    orientation,
    displayMode,
    face,
    scale,
    hidden: value.hidden === true,
    ablated: value.ablated === true,
    previousDisplay
  };
}

function normalizeNoteObject(value: unknown): NoteObject | null {
  if (!isRecord(value)) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const x = typeof value.x === "number" ? value.x : 0;
  const y = typeof value.y === "number" ? value.y : 0;
  const text = typeof value.text === "string" ? value.text : "";
  const rawNoteKind = value.noteKind === "counter-reading" ? "problem" : value.noteKind;
  const noteKind = noteKinds.includes(rawNoteKind as NoteKind)
    ? (rawNoteKind as NoteKind)
    : "free";
  const attachedTo = typeof value.attachedTo === "string" ? value.attachedTo : undefined;

  if (!id) return null;

  return {
    id,
    type: "note",
    x,
    y,
    text,
    noteKind,
    attachedTo
  };
}

function normalizeArrowObject(value: unknown): ArrowObject | null {
  if (!isRecord(value)) return null;

  const id = stringField(value.id);
  if (!id) return null;

  return {
    id,
    type: "arrow",
    x1: typeof value.x1 === "number" ? value.x1 : 0,
    y1: typeof value.y1 === "number" ? value.y1 : 0,
    x2: typeof value.x2 === "number" ? value.x2 : 160,
    y2: typeof value.y2 === "number" ? value.y2 : 0,
    label: stringField(value.label),
    strokeWidth: typeof value.strokeWidth === "number" ? value.strokeWidth : 4
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
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
  const index = typeof value.index === "number" && Number.isFinite(value.index) ? value.index : 0;

  return {
    order: order.length > 0 ? order : [...DOMAIN_ORDER],
    index: Math.max(0, Math.floor(index))
  };
}

function makeFallbackSessionId() {
  return `session_${Date.now()}_migrated`;
}

function stringField(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
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

function normalizeCustomCards(value: unknown): CustomCard[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => normalizeCustomCard(entry))
    .filter((entry): entry is CustomCard => entry !== null);
}

function normalizeCustomDomains(value: unknown): CustomDomainSpec[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      try {
        return parseCustomDomainSpecJson(JSON.stringify(entry)).domain;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is CustomDomainSpec => entry !== null);
}

function normalizeSavedSession(
  value: Record<string, unknown>,
  tableau: CardInstance[],
  notes: NoteObject[],
  arrows: ArrowObject[] = [],
  piles?: Pile[],
  drawCycle?: DrawCycle
): SavedLocalSession {
  const now = new Date().toISOString();
  const modeEnforcement = modeEnforcements.includes(value.modeEnforcement as ModeEnforcement)
    ? (value.modeEnforcement as ModeEnforcement)
    : "guided";

  return {
    id: stringField(value.id, makeFallbackSessionId()),
    title: stringField(value.title, "Untitled session"),
    createdAt: stringField(value.createdAt, now),
    updatedAt: stringField(value.updatedAt, now),
    question: stringField(value.question),
    context: stringField(value.context),
    customCards: normalizeCustomCards(value.customCards),
    customDomains: normalizeCustomDomains(value.customDomains),
    activeModeId: normalizeModeId(value.activeModeId),
    modeEnforcement,
    modeProgress: normalizeModeProgress(value.modeProgress),
    timer: normalizeTimerState(value.timer),
    synthesis: normalizeSynthesis(value.synthesis),
    conclusion: stringField(value.conclusion),
    nextMove: stringField(value.nextMove),
    log: Array.isArray(value.log)
      ? value.log
          .map((entry) => normalizeLogEntry(entry))
          .filter((entry): entry is SessionLogEntry => entry !== null)
      : [],
    tableau,
    notes,
    arrows,
    piles,
    drawCycle
  };
}

export function saveTableau(tableau: CardInstance[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tableau));
}

export function saveLocalSession(tableau: CardInstance[], notes: NoteObject[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tableau, notes }));
}

export function saveFullSession(session: SessionState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function hasSavedLocalSession(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function loadLocalSession(): SavedLocalSession {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { tableau: [], notes: [] };

  try {
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      const tableau = parsed
        .map((entry) => normalizeCardInstance(entry))
        .filter((entry): entry is CardInstance => entry !== null);

      return normalizeSavedSession({}, tableau, [], []);
    }

    if (!isRecord(parsed)) return { tableau: [], notes: [] };

    const rawTableau = Array.isArray(parsed.tableau) ? parsed.tableau : [];
    const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
    const rawArrows = Array.isArray(parsed.arrows) ? parsed.arrows : [];
    const rawPiles = Array.isArray(parsed.piles) ? parsed.piles : [];

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

    return normalizeSavedSession(
      parsed,
      tableau,
      notes,
      arrows,
      piles.length > 0 ? piles : undefined,
      "drawCycle" in parsed ? normalizeDrawCycle(parsed.drawCycle) : undefined
    );
  } catch {
    return { tableau: [], notes: [] };
  }
}

export function loadTableau(): CardInstance[] {
  return loadLocalSession().tableau;
}

export function clearSavedTableau(): void {
  localStorage.removeItem(STORAGE_KEY);
}
