import { DOMAIN_ORDER } from "../core/constants/domains";
import type { GameMode } from "../core/types/mode";
import type { SessionState } from "../core/types/session";
import { domainVector } from "./modeDomain";

function step(state: SessionState) {
  const value = state.modeProgress["midnight-calibration"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function domainForStep(state: SessionState) {
  return DOMAIN_ORDER[step(state) % DOMAIN_ORDER.length] ?? "Source";
}

function pairForDomain(state: SessionState, domain: string) {
  const pile = state.piles.find((candidate) => candidate.domain === domain);
  return (pile?.currentOrder ?? []).slice(0, 2).map((cardId) => ({ cardId, domain }));
}

export const midnightCalibrationMode: GameMode = {
  id: "midnight-calibration",
  name: "Midnight Calibration",
  purpose: "Failure under exhaustion",
  shortDescription: "A fatigue-aware mode that draws card pairs by domain: one interpretation card and one background card.",
  whenToUse:
    "Use when you want to model degraded attention, ambiguity, shortcuts, or reasoning under exhaustion.",
  procedureSummary:
    "For each domain, draw two cards from that same domain. Treat one as the interpretation card and one as background pressure, then advance to the next domain.",
  commentary:
    "All domains are random. Pairing inside each domain prevents the old even/odd rhythm from making some domains always interpreted and others always background.",
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
    "Midnight Calibration deliberately shows fatigue and over-reading. Each domain contributes a pair, so interpretation and atmosphere are separated without domain bias.",
  setupInstructions: [
    "Use a late, low-pressure, or deliberately constrained setting.",
    "Draw two cards from the same domain.",
    "Interpret one card; leave the other as background pressure or atmosphere.",
    "Move to the next domain and repeat."
  ],
  nextStepHint: (state) => {
    const domain = domainForStep(state);
    return `Draw a ${domain} pair: one interpretation card and one background card.`;
  },
  recommendedAction: (state) => {
    const currentStep = step(state);
    const domain = domainForStep(state);
    const cards = pairForDomain(state, domain);

    if (cards.length === 0) {
      return {
        label: `No ${domain} cards available`,
        description: `The ${domain} pile has no cards available for a Midnight Calibration pair.`,
        actionKind: "complete"
      };
    }

    const interpretedIndex = cards.length === 2 ? Math.floor(Math.random() * 2) : 0;
    const interpretedPosition = interpretedIndex === 0 ? "first" : "second";
    return {
      label: `Draw ${domain} pair`,
      description:
        `Draw two ${domain} cards. Randomly treat the ${interpretedPosition} card as interpretation and the other as background pressure.`,
      actionKind: "place-cards",
      domain,
      cards: cards.map((card, index) => ({
        ...card,
        modeRole: index === interpretedIndex ? "interpretation" : "background"
      })),
      count: cards.length,
      drawMode: "random-n",
      subset: "full-domain",
      progressUpdates: {
        step: currentStep + 1,
        lastDomain: domain,
        interpretedPosition
      }
    };
  }
};
