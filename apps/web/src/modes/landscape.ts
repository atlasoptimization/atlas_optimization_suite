import type { GameMode } from "../core/types/mode";
import { getNextDomain } from "../engine/piles";
import { domainVector } from "./modeDomain";

export const landscapeMode: GameMode = {
  id: "landscape",
  name: "Landscape",
  purpose: "Meaning via external form",
  shortDescription: "A spatial mode where the desk behaves like a map and card position matters strongly.",
  whenToUse:
    "Use when topography, distance, border, center, cluster, and gap should guide interpretation.",
  procedureSummary:
    "Draw randomly through all domains. Place cards according to geography and interpret where they land as much as what they say.",
  commentary:
    "All domains are random. Use the tableau like a textured table or map: high/low, near/far, ridge/valley, boundary/center. Works especially well with physical cards / physical surroundings on a real map or terrain-like surface.",
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
    "Landscape makes spatial placement part of the model. Draw cards, drag them into the map, and read topology as evidence.",
  setupInstructions: [
    "Use the tableau as a map, terrain, or textured surface.",
    "Draw random cards through all domains.",
    "Mark ridges, paths, boundaries, clusters, or gaps with notes and arrows."
  ],
  nextStepHint: (state) => {
    const domain = getNextDomain(state.drawCycle) || "Source";
    return `Draw a random ${domain} card, then place it geographically.`;
  },
  recommendedAction: (state) => {
    const domain = getNextDomain(state.drawCycle) || "Source";
    return {
      label: `Draw landscape ${domain} card`,
      description: "Draw a random card and place it by geography: high/low, near/far, border/center, cluster/gap.",
      actionKind: "draw-random",
      domain,
      drawMode: "random-1",
      subset: "full-domain"
    };
  }
};
