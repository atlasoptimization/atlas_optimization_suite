import type { GameMode } from "../core/types/mode";
import { getNextModeDomain, domainVector, hasPlacedDomainCards } from "./modeDomain";

const RANDOM_DOMAINS = ["Source", "Void", "Volition", "Aspect"];

export const modelLiesMode: GameMode = {
  id: "model-lies",
  name: "Model Lies",
  purpose: "Diagnose deception",
  shortDescription: "A diagnostic mode for asking where a fixed model may mislead, conceal, or over-justify itself.",
  whenToUse:
    "Use when a model feels persuasive but suspect, or when you need to test whether the explanation hides weak evidence.",
  procedureSummary:
    "Place Structure and Chameleon masters, freely choose Structure and Chameleon model cards, then draw Source, Void, Volition, and Aspect challenges to justify or accuse the model.",
  commentary:
    "Structure and Chameleon are fixed; Source, Void, Volition, and Aspect are random.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "R",
    Structure: "F",
    Chameleon: "F",
    Void: "R",
    Volition: "R",
    Aspect: "R"
  }),
  description:
    "Model Lies keeps the model fixed and draws challenges around it. Each card asks what the model may be hiding, smoothing over, or incentivized to claim.",
  setupInstructions: [
    "Work at a calm desk with the model visible.",
    "Place Structure and Chameleon as fixed model anchors.",
    "Freely choose supporting Structure and Chameleon cards.",
    "Draw random challenges and write down what the model must justify or where it is accused."
  ],
  nextStepHint: (state) => {
    if (!hasPlacedDomainCards(state, ["Structure", "Chameleon"])) return "Place Structure and Chameleon as fixed model anchors.";
    if (state.modeProgress["model-lies"]?.structureChoiceDone !== true) return "Choose Structure model cards, then click Done.";
    if (state.modeProgress["model-lies"]?.chameleonChoiceDone !== true) return "Choose Chameleon model cards, then click Done.";
    const domain = getNextModeDomain({ domainVector: modelLiesMode.domainVector }, state.drawCycle, ["R"]) || "Source";
    return `Draw a random ${domain} challenge.`;
  },
  recommendedAction: (state) => {
    if (!hasPlacedDomainCards(state, ["Structure", "Chameleon"])) {
      return {
        label: "Place fixed model anchors",
        description: "Place Structure and Chameleon before drawing challenges.",
        actionKind: "place-domain-masters",
        domains: ["Structure", "Chameleon"],
        subset: "domain-masters"
      };
    }

    if (state.modeProgress["model-lies"]?.structureChoiceDone !== true) {
      return {
        label: "Choose Structure model cards",
        description: "Open Structure and choose one or more model-structure cards. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Structure",
        subset: "full-domain",
        progressUpdates: { structureChoiceDone: true }
      };
    }

    if (state.modeProgress["model-lies"]?.chameleonChoiceDone !== true) {
      return {
        label: "Choose Chameleon model cards",
        description: "Open Chameleon and choose one or more model-behaviour cards. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Chameleon",
        subset: "full-domain",
        progressUpdates: { chameleonChoiceDone: true }
      };
    }

    const domain = getNextModeDomain({ domainVector: modelLiesMode.domainVector }, {
      order: RANDOM_DOMAINS,
      index: state.drawCycle.index % RANDOM_DOMAINS.length
    }, ["R"]) || "Source";
    return {
      label: `Draw ${domain} challenge`,
      description: `Draw a random ${domain} card and ask what the fixed model may be concealing or over-claiming.`,
      actionKind: "draw-random",
      domain,
      drawMode: "random-1"
    };
  }
};
