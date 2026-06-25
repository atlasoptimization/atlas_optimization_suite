import type { GameMode } from "../core/types/mode";
import { domainVector } from "./modeDomain";

const CHOSEN_DOMAINS = ["Structure", "Chameleon", "Void"];

function choiceStep(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["exam-clock"]?.choiceStep;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function phase(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["exam-clock"]?.phase;
  return typeof value === "string" ? value : "timer-setup";
}

export const examClockMode: GameMode = {
  id: "exam-clock",
  name: "Exam Clock",
  purpose: "Decision under pressure",
  shortDescription: "A time-boxed decision mode for fixing a problem and goal, then choosing a fast model.",
  whenToUse:
    "Use when you need a modelling decision under deadline pressure and must grade the result afterward.",
  procedureSummary:
    "Fix Source and Volition. Then choose Structure, Chameleon, and Void cards quickly before grading the proposed model.",
  commentary:
    "Source and Volition fixed; Structure, Chameleon, and Void chosen; Aspect absent. The timer opens automatically and frames the final grading pressure.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "C",
    Chameleon: "C",
    Void: "C",
    Volition: "F",
    Aspect: "A"
  }),
  description:
    "Exam Clock compresses modelling into a pressured sequence: fix the problem, fix the criterion, choose a model, then grade it.",
  setupInstructions: [
    "Start the Exam Clock timer.",
    "Place Source and Volition masters as the problem and grading criterion.",
    "Freely choose additional Source and Volition cards from their piles.",
    "Choose Structure, Chameleon, and Void quickly; close by grading the decision."
  ],
  timerPreset: {
    label: "Start Exam Clock timer",
    durationMs: 10 * 60 * 1000,
    messageOnFinish: "Grade the current decision."
  },
  nextStepHint: (state) => {
    const currentPhase = phase(state);
    if (currentPhase === "timer-setup") return "Start the timer and place Source/Volition masters.";
    if (currentPhase === "source-choice") return "Choose additional Source cards, then click Done.";
    if (currentPhase === "volition-choice") return "Choose additional Volition cards, then click Done.";
    return `Choose a ${CHOSEN_DOMAINS[choiceStep(state) % CHOSEN_DOMAINS.length]} card under time pressure.`;
  },
  recommendedAction: (state) => {
    const currentPhase = phase(state);

    if (currentPhase === "timer-setup") {
      return {
        label: "Start Exam Clock",
        description: "Open the timer, start the exam countdown, and place Source and Volition masters.",
        actionKind: "start-timer",
        domains: ["Source", "Volition"],
        subset: "domain-masters",
        timerPreset: examClockMode.timerPreset,
        progressUpdates: { phase: "source-choice" }
      };
    }

    if (currentPhase === "source-choice") {
      return {
        label: "Choose Source cards",
        description: "Open the Source pile and choose any additional problem/context cards. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Source",
        subset: "full-domain",
        progressUpdates: { phase: "volition-choice" }
      };
    }

    if (currentPhase === "volition-choice") {
      return {
        label: "Choose Volition cards",
        description: "Open the Volition pile and choose any additional goal/criterion cards. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Volition",
        subset: "full-domain",
        progressUpdates: { phase: "choice-cycle", choiceStep: 0 }
      };
    }

    const step = choiceStep(state);
    const domain = CHOSEN_DOMAINS[step % CHOSEN_DOMAINS.length];

    return {
      label: `Choose ${domain} under clock`,
      description: `Choose a ${domain} card quickly, then grade the model against the fixed Source and Volition.`,
      actionKind: "choose-candidates",
      domain,
      count: 3,
      drawMode: "choose-1-from-n",
      subset: "full-domain",
      progressUpdates: { choiceStep: step + 1 }
    };
  }
};
