import type { GameMode } from "../core/types/mode";
import { domainVector } from "./modeDomain";

const CYCLE = ["Structure", "Chameleon", "Void", "Volition", "Aspect"];

function step(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["model-archaeology"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export const modelArchaeologyMode: GameMode = {
  id: "model-archaeology",
  name: "Model Archaeology",
  purpose: "Examine past projects",
  shortDescription: "Reconstruct an older model or project by tracing its assumptions, adaptations, gaps, and decisions.",
  whenToUse:
    "Use when reviewing old notes, past modelling work, previous decisions, or inherited project structure.",
  procedureSummary:
    "First freely choose Source cards as the project record. Then cycle Structure, Chameleon, Void, and Volition free-choice pile steps, followed by an Aspect choose-1-from-5 prompt.",
  commentary:
    "Source is fixed; Structure, Chameleon, Void, and Volition are chosen; Aspect is random.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "C",
    Chameleon: "C",
    Void: "C",
    Volition: "C",
    Aspect: "R"
  }),
  description:
    "Model Archaeology treats a past project as a site to excavate. Recreate the model's chronology, then ask what each layer preserved or buried.",
  setupInstructions: [
    "Put old notes or the project record beside the desk.",
    "Freely choose Source cards as the record under examination.",
    "Choose model cards in chronological order and use Aspect draws to question each layer."
  ],
  nextStepHint: (state) => {
    if (state.modeProgress["model-archaeology"]?.sourceFixed !== true) {
      return "Freely choose Source cards as the project record, then click Done.";
    }
    const domain = CYCLE[step(state) % CYCLE.length] ?? "Structure";
    return domain === "Aspect"
      ? "Choose 1 of 5 Aspect cards to question the reconstructed layer."
      : `Freely choose ${domain} cards for the next layer, then click Done.`;
  },
  recommendedAction: (state) => {
    if (state.modeProgress["model-archaeology"]?.sourceFixed !== true) {
      return {
        label: "Choose Source project record",
        description: "Open Source and choose one or more cards representing the old project record. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Source",
        subset: "full-domain",
        progressUpdates: { sourceFixed: true, step: 0 }
      };
    }

    const currentStep = step(state);
    const domain = CYCLE[currentStep % CYCLE.length] ?? "Structure";
    if (domain === "Aspect") {
      return {
        label: "Choose 1 of 5 Aspect",
        description: "Draw up to five Aspect cards, choose one reflective prompt, and discard the rest.",
        actionKind: "choose-candidates",
        domain: "Aspect",
        count: 5,
        drawMode: "choose-1-from-n",
        progressUpdates: { step: currentStep + 1 }
      };
    }

    return {
      label: `Choose ${domain} layer`,
      description: `Open ${domain} and choose one or more cards that help reconstruct the old model chronologically. Click Done when ready.`,
      actionKind: "inspect-pile",
      domain,
      subset: "full-domain",
      progressUpdates: { step: currentStep + 1 }
    };
  }
};
