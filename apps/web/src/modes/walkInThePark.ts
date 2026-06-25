import type { GameMode } from "../core/types/mode";
import { domainVector, getNextModeDomain } from "./modeDomain";

const WALK_DOMAINS = ["Source", "Structure", "Chameleon"];

export const walkInTheParkMode: GameMode = {
  id: "walk-in-the-park",
  name: "Walk in the Park",
  purpose: "Think while moving",
  shortDescription: "A light outdoor mode for reading the surrounding environment through cards.",
  whenToUse:
    "Use while walking, observing a place, or keeping reflection mobile and close to the environment.",
  procedureSummary:
    "Draw randomly from Source, Structure, and Chameleon. Interpret nearby objects, paths, weather, people, or terrain through the drawn card.",
  commentary:
    "Source, Structure, and Chameleon are random; Void, Volition, and Aspect are absent. Works especially well with physical cards / physical surroundings if practical; keep the pace light and avoid overbuilding a formal model.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "R",
    Structure: "R",
    Chameleon: "R",
    Void: "A",
    Volition: "A",
    Aspect: "A"
  }),
  description:
    "Walk in the Park uses motion and environment as part of interpretation: cards point to what you notice while moving. Use short notes in the app and arrange the tableau later.",
  setupInstructions: [
    "Go for an outdoor walk or observe a place in motion.",
    "Draw from Source, Structure, and Chameleon only.",
    "Use short notes for environmental observations; arrange or synthesize later."
  ],
  nextStepHint: (state) => {
    const domain = getNextWalkDomain(state);
    return `Draw a random ${domain} card and connect it to something in the environment.`;
  },
  recommendedAction: (state) => {
    const domain = getNextWalkDomain(state);
    return {
      label: `Draw walk ${domain} card`,
      description:
        "Draw a card, then ask what nearby object, pattern, path, weather, person, or terrain it points to.",
      actionKind: "draw-random",
      domain,
      drawMode: "random-1",
      subset: "full-domain"
    };
  }
};

function getNextWalkDomain(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  return getNextModeDomain(walkInTheParkMode, {
    ...state.drawCycle,
    order: WALK_DOMAINS
  }, ["R"]) || "Source";
}
