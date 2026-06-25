import type { GameMode } from "../core/types/mode";
import { domainVector, hasPlacedDomainCards } from "./modeDomain";

const CYCLE = ["Structure", "Chameleon", "Source", "Void", "Volition", "Ablate"];

function step(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["model-dies"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export const modelDiesMode: GameMode = {
  id: "model-dies",
  name: "Model Dies",
  purpose: "Stress-test a model",
  shortDescription: "A destructive stress-test for a fixed model under selected source pressure, goals, and modifiers.",
  whenToUse:
    "Use when you need to know whether a model survives hostile assumptions, new evidence, or altered decision pressure.",
  procedureSummary:
    "Fix Structure and Chameleon, freely choose model cards, then use Source, Void, and Volition to attack the model before marking cards ablated/destroyed.",
  commentary:
    "Source, Void, and Volition are chosen; Structure and Chameleon are fixed; Aspect is absent.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "C",
    Structure: "F",
    Chameleon: "F",
    Void: "C",
    Volition: "C",
    Aspect: "A"
  }),
  description:
    "Model Dies asks what would kill the model. Keep the model core visible, then choose destructive cards and record where failure starts.",
  setupInstructions: [
    "Use a quiet, focused desk.",
    "Place Structure and Chameleon as the fixed model core.",
    "Choose Structure and Chameleon model cards.",
    "Choose destructive Source, Void, and Volition cards.",
    "Mark broken cards as ablated/destroyed."
  ],
  nextStepHint: (state) => {
    if (!hasPlacedDomainCards(state, ["Structure", "Chameleon"])) return "Place Structure and Chameleon as the model core.";
    const domain = CYCLE[step(state) % CYCLE.length] ?? "Structure";
    if (domain === "Ablate") return "Mark cards as ablated/destroyed before continuing.";
    return `Choose a destructive ${domain} card.`;
  },
  recommendedAction: (state) => {
    if (!hasPlacedDomainCards(state, ["Structure", "Chameleon"])) {
      return {
        label: "Place model core",
        description: "Place Structure and Chameleon before stress-testing the model.",
        actionKind: "place-domain-masters",
        domains: ["Structure", "Chameleon"],
        subset: "domain-masters"
      };
    }

    const currentStep = step(state);
    const domain = CYCLE[currentStep % CYCLE.length] ?? "Structure";
    if (domain === "Ablate") {
      return {
        label: "Mark ablated/destroyed cards",
        description: "Mark destroyed cards: select cards that failed and use Study > Toggle ablated/destroyed, then continue the destructive cycle.",
        actionKind: "create-note",
        progressUpdates: { step: currentStep + 1 }
      };
    }
    return {
      label: `Choose destructive ${domain}`,
      description: `Open ${domain} and choose one or more cards that could break, reverse, or expose the fixed model. Click Done when ready.`,
      actionKind: "inspect-pile",
      domain,
      subset: "full-domain",
      progressUpdates: { step: currentStep + 1 }
    };
  }
};
