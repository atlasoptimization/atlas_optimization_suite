import { DOMAIN_ORDER } from "../core/constants/domains";
import type { GameMode } from "../core/types/mode";
import { getNextDomain } from "../engine/piles";

export const freeMode: GameMode = {
  id: "free",
  name: "Free",
  purpose: "Unrestricted exploration",
  shortDescription: "Manual desk mode for exploratory modelling without procedural constraints.",
  whenToUse:
    "Use when you want to browse, draw, arrange, annotate, and interpret the deck freely without following a formal procedure.",
  procedureSummary:
    "Next follows Source, Structure, Chameleon, Void, Volition, Aspect and draws one random visible card from the current domain. All manual actions remain available.",
  domainVector: Object.fromEntries(DOMAIN_ORDER.map((domain) => [domain, "C"])),
  description:
    "Free mode is the default open workspace. It gives you the normal domain-cycle draw as a convenience, but it does not restrict pile inspection, card choice, notes, arrows, context menus, or manual placement.",
  setupInstructions: [
    "Use Next when you want a simple domain-cycle prompt.",
    "Use piles, browser cards, notes, arrows, context menus, and manual placement freely.",
    "Switch to a guided mode later if the session needs a stronger procedure."
  ],
  nextStepHint: (state) => {
    const domain = getNextDomain(state.drawCycle);
    return domain ? `Draw one random ${domain} card.` : "Draw one random card from the next domain.";
  }
};
