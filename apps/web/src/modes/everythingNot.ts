import type { GameMode } from "../core/types/mode";
import { domainVector, hasPlacedDomainCards } from "./modeDomain";

const MODEL_CORE_DOMAINS = ["Structure", "Chameleon"];

function phaseDone(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0], key: string) {
  return state.modeProgress["everything-not"]?.[key] === true;
}

export const everythingNotMode: GameMode = {
  id: "everything-not",
  name: "Everything Not",
  purpose: "Model alternatives",
  shortDescription: "A mode for asking what the current model is not.",
  whenToUse:
    "Use when you have a model core and want to explore alternatives, exclusions, and non-membership.",
  procedureSummary:
    "Fix Structure and Chameleon masters. Choose Structure support, choose Chameleon support, then draw random Void cards.",
  commentary:
    "Structure and Chameleon are fixed, Void is random, Source/Volition/Aspect are absent. The mode uses Void to test the negative space around a model.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "A",
    Structure: "F",
    Chameleon: "F",
    Void: "R",
    Volition: "A",
    Aspect: "A"
  }),
  description:
    "Everything Not starts from a fixed model representation and probes what falls outside it.",
  setupInstructions: [
    "Start with an empty desk.",
    "Place Structure and Chameleon as the model-defining core.",
    "Choose additional Structure cards, then Chameleon cards.",
    "Only after both choice phases, draw random Void cards as alternatives or exclusions."
  ],
  nextStepHint: (state) =>
    !hasPlacedDomainCards(state, MODEL_CORE_DOMAINS)
      ? "Place the Structure and Chameleon master cards as the model core."
      : !phaseDone(state, "structureChoiceDone")
        ? "Choose supporting Structure cards, then click Done."
        : !phaseDone(state, "chameleonChoiceDone")
          ? "Choose supporting Chameleon cards, then click Done."
          : "Draw a random Void card to explore what the model is not.",
  recommendedAction: (state) => {
    if (!hasPlacedDomainCards(state, MODEL_CORE_DOMAINS)) {
      return {
          label: "Place model master cards",
          description: "Place Structure and Chameleon as the fixed model core.",
          actionKind: "place-domain-masters",
          domains: MODEL_CORE_DOMAINS,
          subset: "domain-masters"
      };
    }

    if (!phaseDone(state, "structureChoiceDone")) {
      return {
        label: "Choose Structure cards",
        description: "Open Structure and choose supporting model-structure cards, then click Done.",
        actionKind: "inspect-pile",
        domain: "Structure",
        subset: "full-domain",
        progressUpdates: { structureChoiceDone: true }
      };
    }

    if (!phaseDone(state, "chameleonChoiceDone")) {
      return {
        label: "Choose Chameleon cards",
        description: "Open Chameleon and choose supporting model-behaviour cards, then click Done.",
        actionKind: "inspect-pile",
        domain: "Chameleon",
        subset: "full-domain",
        progressUpdates: { chameleonChoiceDone: true }
      };
    }

    return {
      label: "Draw random Void card",
      description: "Draw one random Void card to probe model alternatives.",
      actionKind: "draw-random",
      domain: "Void",
      drawMode: "random-1",
      subset: "full-domain"
    };
  }
};
