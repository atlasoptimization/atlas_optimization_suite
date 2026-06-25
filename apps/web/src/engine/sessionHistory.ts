import type { DeckAction } from "../core/types/action";
import type { SessionState } from "../core/types/session";
import { appendSessionLog } from "./sessionLog";
import { sessionReducer } from "./sessionReducer";

const HISTORY_LIMIT = 100;
const MOVE_COALESCE_MS = 500;

export type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
  lastRecordedAction?: DeckAction;
  lastRecordedAt?: number;
};

export function createHistoryState<T>(present: T): HistoryState<T> {
  return {
    past: [],
    present,
    future: []
  };
}

export function canUndo(history: HistoryState<SessionState>) {
  return history.past.length > 0;
}

export function canRedo(history: HistoryState<SessionState>) {
  return history.future.length > 0;
}

export function applyHistoryAction(
  history: HistoryState<SessionState>,
  action: DeckAction
): HistoryState<SessionState> {
  const nextPresent = sessionReducer(history.present, action);

  if (action.type === "session.load") {
    return createHistoryState(nextPresent);
  }

  if (!isUndoableAction(action)) {
    return {
      ...history,
      present: nextPresent
    };
  }

  const now = Date.now();
  const shouldCoalesce = shouldCoalesceAction(
    history.lastRecordedAction,
    action,
    history.lastRecordedAt,
    now
  );

  return {
    past: shouldCoalesce
      ? history.past
      : [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: nextPresent,
    future: [],
    lastRecordedAction: action,
    lastRecordedAt: now
  };
}

export function undoHistory(history: HistoryState<SessionState>): HistoryState<SessionState> {
  const previous = history.past.at(-1);
  if (!previous) return history;

  return {
    past: history.past.slice(0, -1),
    present: appendSessionLog(previous, {
      actionType: "history.undo",
      label: "Undo"
    }),
    future: [history.present, ...history.future],
    lastRecordedAction: undefined,
    lastRecordedAt: undefined
  };
}

export function redoHistory(history: HistoryState<SessionState>): HistoryState<SessionState> {
  const next = history.future[0];
  if (!next) return history;

  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: appendSessionLog(next, {
      actionType: "history.redo",
      label: "Redo"
    }),
    future: history.future.slice(1),
    lastRecordedAction: undefined,
    lastRecordedAt: undefined
  };
}

function isUndoableAction(action: DeckAction) {
  switch (action.type) {
    case "card.selectInstance":
    case "note.select":
    case "piles.initialize":
    case "mode.updateProgress":
      return false;
    case "session.load":
      return false;
    default:
      return true;
  }
}

function shouldCoalesceAction(
  previous: DeckAction | undefined,
  action: DeckAction,
  previousAt: number | undefined,
  now: number
) {
  if (!previous || previousAt === undefined || now - previousAt > MOVE_COALESCE_MS) {
    return false;
  }

  if (
    previous.type === "card.move" &&
    action.type === "card.move" &&
    previous.instanceId === action.instanceId
  ) {
    return true;
  }

  if (
    previous.type === "note.move" &&
    action.type === "note.move" &&
    previous.noteId === action.noteId
  ) {
    return true;
  }

  if (
    previous.type === "arrow.move" &&
    action.type === "arrow.move" &&
    previous.arrowId === action.arrowId
  ) {
    return true;
  }

  if (
    previous.type === "arrow.moveEndpoint" &&
    action.type === "arrow.moveEndpoint" &&
    previous.arrowId === action.arrowId &&
    previous.endpoint === action.endpoint
  ) {
    return true;
  }

  if (
    previous.type === "note.updateText" &&
    action.type === "note.updateText" &&
    previous.noteId === action.noteId
  ) {
    return true;
  }

  return false;
}
