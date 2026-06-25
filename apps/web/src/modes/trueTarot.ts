import { DOMAIN_ORDER } from "../core/constants/domains";
import type { GameMode } from "../core/types/mode";
import { getNextDomain } from "../engine/piles";

export const trueTarotMode: GameMode = {
  id: "true-tarot",
  name: "True Tarot",
  purpose: "Surprise, intuition, blind placement",
  shortDescription: "Blind-draw mode for delaying interpretation until after placement.",
  whenToUse:
    "Use when you want to avoid premature interpretation, invite surprise, or test whether the arrangement itself suggests a reading.",
  procedureSummary:
    "Draw one hidden card from the current domain, arrange it face-down, advance the cycle, then reveal and interpret when ready.",
  domainVector: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, "R"])),
  description:
    "True Tarot uses random hidden draws as a modelling provocation, not as fortune telling. The point is to separate placement from interpretation so the reveal can challenge the first explanation.",
  setupInstructions: [
    "Draw hidden cards without checking their names or effects.",
    "Arrange the hidden cards first, using position and domain as the only visible cues.",
    "Reveal cards when the layout is ready, then interpret them against the emerging pattern."
  ],
  nextStepHint: (state) => {
    const domain = getNextDomain(state.drawCycle);
    return domain
      ? `Draw one hidden ${domain} card, arrange it, then reveal when ready.`
      : "Draw and place blindly, then interpret.";
  },
  recommendedAction: (state) => {
    const domain = getNextDomain(state.drawCycle);
    return domain
      ? {
          label: `Draw hidden card from ${domain}`,
          description: `Draw one ${domain} card face-down and advance the cycle.`,
          actionKind: "draw-hidden",
          domain,
          drawMode: "secret-1",
          subset: "full-domain"
        }
      : null;
  }
};
