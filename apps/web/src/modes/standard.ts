import { DOMAIN_ORDER } from "../core/constants/domains";
import type { GameMode } from "../core/types/mode";
import { getNextDomain } from "../engine/piles";

export const standardMode: GameMode = {
  id: "standard",
  name: "Standard",
  purpose: "Standard analysis / broad modelling reflection",
  shortDescription: "Balanced mode for a full pass through all six domains.",
  whenToUse:
    "Use when you want systematic coverage of the deck's modelling domains while still choosing the card that best fits the question.",
  procedureSummary:
    "Cycle through Source, Structure, Chameleon, Void, Volition, Aspect. For each domain, draw up to five candidates, choose one, and discard the rest.",
  domainVector: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, "C"])),
  description:
    "Standard mode slows each draw down enough to compare alternatives. It is useful for broad analysis because every domain gets a turn, but the final placement is still chosen by the modeller.",
  setupInstructions: [
    "Start at the current domain in the cycle.",
    "Draw five candidates, choose one, and let unchosen cards go to discard.",
    "Place and interpret the chosen card in relation to the current tableau before advancing."
  ],
  nextStepHint: (state) => {
    const domain = getNextDomain(state.drawCycle);
    return domain ? `Draw 5 and choose 1 from ${domain}.` : "Draw 5 and choose 1 from the next domain in cycle.";
  },
  recommendedAction: (state) => {
    const domain = getNextDomain(state.drawCycle);
    return domain
      ? {
          label: `Draw 5 and choose 1 from ${domain}`,
          description: `Draw up to five ${domain} candidates, choose one, and discard the rest.`,
          actionKind: "choose-candidates",
          domain,
          count: 5,
          drawMode: "choose-1-from-n",
          subset: "full-domain"
        }
      : null;
  }
};
