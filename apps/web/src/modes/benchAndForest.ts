import type { GameMode } from "../core/types/mode";
import { domainVector } from "./modeDomain";

const OBSERVATION_DOMAINS = ["Source", "Aspect"];

function observationStep(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["bench-and-forest"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export const benchAndForestMode: GameMode = {
  id: "bench-and-forest",
  name: "Bench and Forest",
  purpose: "Reconnect with phenomena",
  shortDescription: "A phenomenological mode for attaching Source and Aspect cards to observed objects or impressions.",
  whenToUse:
    "Use outdoors or whenever the modelling task needs grounding in what is directly present.",
  procedureSummary:
    "Choose Source and Aspect cards, then attach them to nearby objects, phenomena, or impressions with notes.",
  commentary:
    "Source and Aspect are chosen; Structure, Chameleon, Void, and Volition are absent. Works especially well with physical cards / physical surroundings so cards can be attached to observed things and impressions.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "C",
    Structure: "A",
    Chameleon: "A",
    Void: "A",
    Volition: "A",
    Aspect: "C"
  }),
  description:
    "Bench and Forest reconnects the deck to phenomena: Source names what is present, Aspect gives an angle of attention.",
  setupInstructions: [
    "Sit somewhere with observable objects, textures, people, or phenomena.",
    "Choose Source cards for what is present.",
    "Choose Aspect cards as angles on nearby objects; write observation notes."
  ],
  nextStepHint: (state) => {
    const step = observationStep(state);
    const domain = OBSERVATION_DOMAINS[step % OBSERVATION_DOMAINS.length];
    return `Choose a ${domain} card and attach it to an observed object or phenomenon.`;
  },
  recommendedAction: (state) => {
    const step = observationStep(state);
    const domain = OBSERVATION_DOMAINS[step % OBSERVATION_DOMAINS.length];

    return {
      label: `Choose ${domain} observation card`,
      description:
        domain === "Source"
          ? "Choose a Source card for what is actually present nearby."
          : "Choose an Aspect card as an angle on a nearby object or topic.",
      actionKind: "choose-candidates",
      domain,
      count: 3,
      drawMode: "choose-1-from-n",
      subset: "full-domain",
      progressUpdates: { step: step + 1, hint: "add-observation-note" }
    };
  }
};
