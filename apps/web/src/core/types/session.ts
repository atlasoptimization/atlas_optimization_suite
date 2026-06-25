import type { CardDisplayMode, CardFace } from "./view";
import type { ModeEnforcement } from "./mode";
import type { CustomCard } from "./card";
import type { CustomDomainSpec } from "./customDomain";

export type Orientation = "upright" | "reversed" | "modifier" | "question";

export type CardRotation = 0 | 90 | 180 | 270;

export type Pile = {
  id: string;
  name: string;
  domain?: string;
  cardIds: string[];
  currentOrder: string[];
  drawnCardIds: string[];
  discardCardIds: string[];
  shuffleSeed?: string;
};

export type DrawCycle = {
  order: string[];
  index: number;
};

export type CardInstance = {
  instanceId: string;
  cardId: string;
  x: number;
  y: number;
  rotation: CardRotation;
  orientation: Orientation;
  displayMode: CardDisplayMode;
  face: CardFace;
  scale: number;
  hidden: boolean;
  ablated: boolean;
  previousDisplay?: {
    displayMode: CardDisplayMode;
    face?: CardFace;
  };
};

export type PendingDrawChoice = {
  domain: string;
  cardIds: string[];
  cardDomains?: Record<string, string>;
  advanceCycle?: boolean;
  displayMode?: CardDisplayMode;
  face?: CardFace;
  scale?: number;
};

export type NoteKind = "free" | "insight" | "problem" | "opportunity" | "action" | "question";

export type NoteObject = {
  id: string;
  type: "note";
  x: number;
  y: number;
  text: string;
  noteKind: NoteKind;
  attachedTo?: string;
};

export type ArrowObject = {
  id: string;
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
  strokeWidth?: number;
};

export type BoardObject = CardInstance | NoteObject | ArrowObject;

export type SessionLogEntry = {
  id: string;
  timestamp: string;
  actionType: string;
  label: string;
  cardId?: string;
  instanceId?: string;
  domain?: string;
  details?: Record<string, unknown>;
};

export type SessionSynthesis = {
  expected?: string;
  surprise?: string;
  noteworthy?: string;
  insight?: string;
};

export type ModeProgress = Record<string, Record<string, unknown>>;

export type TimerMode = "stopwatch" | "countdown";

export type TimerStatus = "idle" | "running" | "paused" | "finished";

export type TimerActionOnFinish =
  | "none"
  | "show-message"
  | "next"
  | "ask-before-next"
  | "draw-next"
  | "open-draw-next-confirmation";

export type TimerState = {
  visible: boolean;
  mode: TimerMode;
  status: TimerStatus;
  startedAt?: string;
  pausedAt?: string;
  accumulatedMs: number;
  durationMs?: number;
  messageOnFinish?: string;
  actionOnFinish: TimerActionOnFinish;
  autoRestart: boolean;
  restartDelayMs?: number;
  lastFinishedAt?: string;
};

export type SessionState = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  question?: string;
  context?: string;
  customCards: CustomCard[];
  customDomains: CustomDomainSpec[];
  tableau: CardInstance[];
  notes: NoteObject[];
  arrows: ArrowObject[];
  log: SessionLogEntry[];
  selectedInstanceId: string | null;
  selectedNoteId: string | null;
  selectedArrowId: string | null;
  piles: Pile[];
  drawCycle: DrawCycle;
  pendingDrawChoice: PendingDrawChoice | null;
  activeModeId?: string;
  modeEnforcement: ModeEnforcement;
  modeProgress: ModeProgress;
  timer: TimerState;
  synthesis?: SessionSynthesis;
  conclusion?: string;
  nextMove?: string;
};
