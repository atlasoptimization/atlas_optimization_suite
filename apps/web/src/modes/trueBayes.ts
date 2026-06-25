import type { GameMode } from "../core/types/mode";
import { getNextDomain } from "../engine/piles";
import { domainVector } from "./modeDomain";

export const trueBayesMode: GameMode = {
  id: "true-bayes",
  name: "True Bayes",
  purpose: "Free association / brainstorm",
  shortDescription: "A fast random-association mode for generating hypotheses without over-controlling the draw.",
  whenToUse:
    "Use when you need a brisk brainstorm, especially in an unexpected place or when the problem needs looser associations.",
  procedureSummary:
    "Draw randomly through all domains, place cards freely, and keep the tempo high before interpreting patterns.",
  commentary:
    "All domains are random. A 20 second countdown keeps the association moving; each finish can trigger Next automatically.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "R",
    Structure: "R",
    Chameleon: "R",
    Void: "R",
    Volition: "R",
    Aspect: "R"
  }),
  description:
    "True Bayes uses quick random draws as a lightweight brainstorm. Draw, place, and update your interpretation without pausing for heavy selection.",
  setupInstructions: [
    "Use any setting that helps loosen the problem frame.",
    "Start the 20 second rhythm timer.",
    "Draw randomly from the current domain in the cycle.",
    "Place cards quickly, then read the accumulated pattern as provisional evidence."
  ],
  timerPreset: {
    label: "Start True Bayes 20s timer",
    durationMs: 20 * 1000,
    messageOnFinish: "Next",
    actionOnFinish: "next",
    autoRestart: true
  },
  nextStepHint: (state) => {
    if (state.modeProgress["true-bayes"]?.timerStarted !== true) {
      return "Start the 20 second True Bayes timer.";
    }
    const domain = getNextDomain(state.drawCycle) || "Source";
    return `Draw a random ${domain} card and place it quickly.`;
  },
  recommendedAction: (state) => {
    if (state.modeProgress["true-bayes"]?.timerStarted !== true) {
      return {
        label: "Start 20s True Bayes timer",
        description: "Open the timer, set a 20 second countdown, and let each finish trigger Next.",
        actionKind: "start-timer",
        timerPreset: trueBayesMode.timerPreset,
        progressUpdates: { timerStarted: true }
      };
    }
    const domain = getNextDomain(state.drawCycle) || "Source";
    return {
      label: `Draw fast ${domain} card`,
      description: "Draw one random card, place it freely, and keep the brainstorm moving.",
      actionKind: "draw-random",
      domain,
      drawMode: "random-1",
      subset: "full-domain"
    };
  }
};
