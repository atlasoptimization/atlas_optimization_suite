import type { GameMode, ModeRecommendation } from "../core/types/mode";
import { LINEAR_CALIBRATION_SCRIPT_ID, getScriptedSession } from "../demo/scriptedSessions";

const SCRIPTED_MODE_ID = "scripted-demo";

export const scriptedDemoMode: GameMode = {
  id: SCRIPTED_MODE_ID,
  name: "Example Sessions",
  purpose: "Choose a curated scripted walkthrough.",
  shortDescription: "Scripted walkthroughs that place cards, notes, and arrows step by step.",
  whenToUse: "Use when learning how the deck can structure a modelling discussion.",
  procedureSummary:
    "Choose an example session, then press Next to unfold the scripted tableau.",
  domainVector: {
    Source: "A",
    Structure: "A",
    Chameleon: "A",
    Void: "A",
    Volition: "A",
    Aspect: "A"
  },
  description:
    "Example Sessions are instructional walkthroughs. They do not draw from the normal mode cycle; each Next step executes one curated example action.",
  setupInstructions: [
    "Choose Sensor Calibration Review or Business Strategy Abstraction from the mode menu or Help.",
    "Press Next repeatedly to place cards, notes, and arrows in order."
  ],
  recommendedAction: (state): ModeRecommendation => {
    const progress = state.modeProgress[SCRIPTED_MODE_ID] ?? {};
    const scriptId =
      typeof progress.scriptId === "string" ? progress.scriptId : LINEAR_CALIBRATION_SCRIPT_ID;
    const stepIndex =
      typeof progress.stepIndex === "number" && Number.isFinite(progress.stepIndex)
        ? Math.max(0, Math.floor(progress.stepIndex))
        : 0;
    const script = getScriptedSession(scriptId);
    const step = script.steps[stepIndex];

    if (!step) {
      return {
        id: `${SCRIPTED_MODE_ID}:complete`,
        label: "Script complete",
        description: "The scripted example is complete.",
        mechanical: "Script complete",
        interpretation: "Review the finished tableau and compare it with your own modelling problem.",
        actionKind: "complete",
        kind: "ending"
      };
    }

    return {
      id: `${SCRIPTED_MODE_ID}:${script.id}:${stepIndex}`,
      label: labelForStep(step),
      description: step.commentary ?? script.description,
      mechanical: mechanicalForStep(step),
      interpretation: step.commentary ?? "Advance the curated example by one action.",
      actionKind: "script-step",
      kind: step.type === "set-session-details" || step.type === "set-mode" ? "setup" : "core",
      scriptId: script.id,
      stepIndex,
      targetDomains: step.type === "place-card" && step.cardRef.domain ? [step.cardRef.domain] : []
    };
  }
};

function labelForStep(step: ReturnType<typeof getScriptedSession>["steps"][number]) {
  if (step.type === "place-card") return `Place card: ${step.cardRef.cardname ?? step.cardRef.id ?? "specific card"}`;
  if (step.type === "add-note") return "Add note";
  if (step.type === "add-arrow") return step.label ? `Add arrow: ${step.label}` : "Add arrow";
  if (step.type === "set-mode") return "Set mode";
  return "Set session details";
}

function mechanicalForStep(step: ReturnType<typeof getScriptedSession>["steps"][number]) {
  if (step.type === "place-card") {
    return `Place card: ${step.cardRef.cardname ?? step.cardRef.id ?? "specific card"}`;
  }
  if (step.type === "add-note") return `Add ${step.noteType} note`;
  if (step.type === "add-arrow") return step.label ? `Add arrow: ${step.label}` : "Add arrow";
  if (step.type === "set-mode") return `Set mode: ${step.modeId}`;
  return "Set session title, question, and context";
}
