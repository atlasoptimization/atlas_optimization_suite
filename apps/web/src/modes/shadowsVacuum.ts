import type { GameMode } from "../core/types/mode";
import { domainVector, hasPlacedDomainCard } from "./modeDomain";

function sourceChoiceDone(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  return state.modeProgress["shadows-vacuum"]?.sourceChoiceDone === true;
}

export const shadowsVacuumMode: GameMode = {
  id: "shadows-vacuum",
  name: "Shadows & Vacuum",
  purpose: "Absence / boundary focus",
  shortDescription: "A quiet mode for investigating what is missing, unused, or outside the model boundary.",
  whenToUse:
    "Use when the important question is not what the model contains, but what it excludes, cannot see, or leaves unresolved.",
  procedureSummary:
    "Place Source, choose any supporting Source cards, then repeatedly draw five Void candidates and keep one.",
  commentary:
    "Source fixed, Void chosen, all other domains absent. The unused deck and empty space matter: treat them as evidence of boundary and omission.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "F",
    Structure: "A",
    Chameleon: "A",
    Void: "C",
    Volition: "A",
    Aspect: "A"
  }),
  description:
    "Shadows & Vacuum removes most modelling domains so the desk can focus on absence and boundary conditions.",
  setupInstructions: [
    "Begin in a quiet or low-distraction setting.",
    "Place the Source master automatically as the context.",
    "Choose any additional Source cards that belong on the desk.",
    "Then use Void choose-1-from-5 rounds to map absence and boundary."
  ],
  nextStepHint: (state) =>
    !hasPlacedDomainCard(state, "Source")
      ? "Place the Source master/context first."
      : !sourceChoiceDone(state)
        ? "Choose any supporting Source cards, then click Done."
        : "Draw five Void candidates, keep one, and discard the rest.",
  recommendedAction: (state) => {
    if (!hasPlacedDomainCard(state, "Source")) {
      return {
          label: "Place Source master",
          description: "Place the Source master card as the fixed phenomenon/context.",
          actionKind: "place-domain-masters",
          domains: ["Source"],
          subset: "domain-masters"
      };
    }

    if (!sourceChoiceDone(state)) {
      return {
        label: "Choose Source cards",
        description: "Open the Source pile. Draw or inspect supporting Source cards, then click Done to move into Void rounds.",
        actionKind: "inspect-pile",
        domain: "Source",
        subset: "full-domain",
        progressUpdates: { sourceChoiceDone: true }
      };
    }

    return {
      label: "Draw 5 and choose 1 from Void",
      description: "Reveal five Void candidates, keep one absence/boundary card, and discard the rest.",
      actionKind: "choose-candidates",
      domain: "Void",
      count: 5,
      drawMode: "choose-1-from-n",
      subset: "full-domain"
    };
  }
};
