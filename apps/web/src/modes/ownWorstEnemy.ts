import type { GameMode } from "../core/types/mode";
import { domainVector, hasPlacedDomainCard } from "./modeDomain";

const CHOSEN_DOMAINS = ["Structure", "Chameleon", "Volition"];

function progressStep(mode: GameMode, state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress[mode.id]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function stanceForStep(step: number) {
  return step % 2 === 0 ? "Pro" : "Anti";
}

export const ownWorstEnemyMode: GameMode = {
  id: "own-worst-enemy",
  name: "Own Worst Enemy",
  purpose: "Be model and problem",
  shortDescription: "A reflective adversarial mode for arguing both for and against your own model.",
  whenToUse:
    "Use when you need to defend a model and attack it with equal seriousness before trusting it.",
  procedureSummary:
    "Fix Source as the problem context. Then alternate pro-model and anti-model stances while choosing Structure, Chameleon, and Volition cards.",
  commentary:
    "Source fixed; Structure, Chameleon, and Volition chosen; Void and Aspect absent. The mode alternates salvage and destruction rather than drawing neutral evidence.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "C",
    Chameleon: "C",
    Void: "A",
    Volition: "C",
    Aspect: "A"
  }),
  description:
    "Own Worst Enemy turns modelling into adversarial self-dialogue: one turn salvages the model, the next exposes where it breaks.",
  setupInstructions: [
    "Work solo and reflectively.",
    "Fix Source as the problem or phenomenon before the dialogue begins.",
    "Use Structure for assumptions, Chameleon for behaviour, and Volition for decision pressure."
  ],
  nextStepHint: (state) => {
    if (!hasPlacedDomainCard(state, "Source")) return "Place the Source master/context first.";
    if (state.modeProgress["own-worst-enemy"]?.sourceChoiceDone !== true) {
      return "Choose supporting Source cards from the full pile, then click Done.";
    }
    const step = progressStep(ownWorstEnemyMode, state);
    return `${stanceForStep(step)} stance: choose a ${CHOSEN_DOMAINS[step % CHOSEN_DOMAINS.length]} card.`;
  },
  recommendedAction: (state) => {
    if (!hasPlacedDomainCard(state, "Source")) {
      return {
        label: "Place Source master",
        description: "Fix Source as the problem context before alternating stances.",
        actionKind: "place-domain-masters",
        domains: ["Source"],
        subset: "domain-masters"
      };
    }

    if (state.modeProgress["own-worst-enemy"]?.sourceChoiceDone !== true) {
      return {
        label: "Choose Source cards",
        description: "Open Source and choose supporting problem/context cards from the full pile. Click Done when ready.",
        actionKind: "inspect-pile",
        domain: "Source",
        subset: "full-domain",
        progressUpdates: { sourceChoiceDone: true, step: 0 }
      };
    }

    const step = progressStep(ownWorstEnemyMode, state);
    const stance = stanceForStep(step);
    const domain = CHOSEN_DOMAINS[step % CHOSEN_DOMAINS.length];

    return {
      label: `${stance} stance: choose ${domain} card`,
      description:
        stance === "Pro"
          ? `Choose a ${domain} card and argue how it supports or salvages the model.`
          : `Choose a ${domain} card and argue how it damages or exposes the model.`,
      actionKind: "inspect-pile",
      domain,
      subset: "full-domain",
      progressUpdates: { step: step + 1, stance: stance === "Pro" ? "anti" : "pro" }
    };
  }
};
