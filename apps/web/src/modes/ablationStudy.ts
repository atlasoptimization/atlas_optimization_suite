import type { GameMode } from "../core/types/mode";
import { domainVector, hasPlacedDomainCard } from "./modeDomain";

const MODEL_CORE_DOMAINS = ["Structure", "Chameleon"];

export const ablationStudyMode: GameMode = {
  id: "ablation-study",
  name: "Ablation Study",
  purpose: "Minimal compatible assumptions",
  shortDescription: "A mode for finding which source and model assumptions are actually necessary.",
  whenToUse:
    "Use when a model feels overloaded and you want to know what can be removed before it fails.",
  procedureSummary:
    "Place Source, choose supporting Source cards, place Structure and Chameleon as the model core, freely choose Chameleon support, then mark cards as ablated until the interpretation breaks.",
  commentary:
    "Source, Structure, and Chameleon are fixed; Void, Volition, and Aspect are absent. Treat ablated cards as assumptions under test, not as deleted material.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "F",
    Chameleon: "F",
    Void: "A",
    Volition: "A",
    Aspect: "A"
  }),
  description:
    "Ablation Study keeps the phenomenon and model core visible while you remove assumptions until the model no longer works.",
  setupInstructions: [
    "Work solo in a calm workspace.",
    "Place Source as the phenomenon.",
    "Choose or review supporting Source cards.",
    "Place Structure and Chameleon as fixed model anchors.",
    "Choose or review supporting Chameleon cards.",
    "Toggle cards as ablated to test whether the model still holds without them."
  ],
  nextStepHint: (state) => {
    if (!hasPlacedDomainCard(state, "Source")) return "Place Source as the phenomenon first.";
    if (state.modeProgress["ablation-study"]?.reviewedSourceCards !== true) {
      return "Choose or review supporting Source cards, then click Done.";
    }
    const missing = MODEL_CORE_DOMAINS.find((domain) => !hasPlacedDomainCard(state, domain));
    if (missing) return `Place ${missing} as part of the model core.`;
    if (state.modeProgress["ablation-study"]?.reviewedChameleonCards !== true) {
      return "Choose or review supporting Chameleon cards, then click Done.";
    }
    return "Select a card and use Study > Toggle ablated/destroyed.";
  },
  recommendedAction: (state) => {
    if (!hasPlacedDomainCard(state, "Source")) {
      return {
        label: "Place Source master",
        description: "Place The Source as the fixed phenomenon before ablation.",
        actionKind: "place-domain-masters",
        domains: ["Source"],
        subset: "domain-masters"
      };
    }

    const progress = state.modeProgress["ablation-study"] ?? {};
    if (progress.reviewedSourceCards !== true) {
      return {
        label: "Review Source cards",
        description:
          "Open Source, draw or inspect supporting phenomenon cards, then click Done to place the model core.",
        actionKind: "inspect-pile",
        domain: "Source",
        subset: "full-domain",
        progressUpdates: { reviewedSourceCards: true }
      };
    }

    const missingModelCore = MODEL_CORE_DOMAINS.filter((domain) => !hasPlacedDomainCard(state, domain));
    if (missingModelCore.length > 0) {
      return {
        label: "Place model core",
        description: "Place Structure and Chameleon as the fixed model core before ablation.",
        actionKind: "place-domain-masters",
        domains: missingModelCore,
        subset: "domain-masters"
      };
    }

    if (progress.reviewedChameleonCards !== true) {
      return {
        label: "Review Chameleon cards",
        description:
          "Open Chameleon, draw or inspect supporting model-behaviour cards, then click Done to begin ablation.",
        actionKind: "inspect-pile",
        domain: "Chameleon",
        subset: "full-domain",
        progressUpdates: { reviewedChameleonCards: true }
      };
    }

    return {
      label: "Mark cards as ablated/destroyed",
      description:
        "Select a Source, Structure, or Chameleon card on the board and use Study > Toggle ablated/destroyed.",
      actionKind: "complete"
    };
  }
};
