import type { SessionState } from "../core/types/session";
import { DOMAIN_ORDER } from "../core/constants/domains";
import { DEFAULT_MODE_ID } from "../modes/constants";

function makeSessionId() {
  return `session_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function createSession(): SessionState {
  const now = new Date().toISOString();

  return {
    id: makeSessionId(),
    title: "Untitled session",
    createdAt: now,
    updatedAt: now,
    question: "",
    context: "",
    customCards: [],
    customDomains: [],
    tableau: [],
    notes: [],
    arrows: [],
    log: [],
    selectedInstanceId: null,
    selectedNoteId: null,
    selectedArrowId: null,
    piles: [],
    drawCycle: {
      order: [...DOMAIN_ORDER],
      index: 0
    },
    pendingDrawChoice: null,
    activeModeId: DEFAULT_MODE_ID,
    modeEnforcement: "guided",
    modeProgress: {},
    timer: {
      visible: false,
      mode: "stopwatch",
      status: "idle",
      accumulatedMs: 0,
      durationMs: 120000,
      messageOnFinish: "Next",
      actionOnFinish: "none",
      autoRestart: false
    },
    synthesis: {
      expected: "",
      surprise: "",
      noteworthy: "",
      insight: ""
    },
    conclusion: "",
    nextMove: ""
  };
}
