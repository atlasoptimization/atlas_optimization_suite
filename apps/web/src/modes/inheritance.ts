import type { GameMode } from "../core/types/mode";
import { domainVector } from "./modeDomain";

export const inheritanceMode: GameMode = {
  id: "inheritance",
  name: "Inheritance",
  purpose: "Origins and influence",
  shortDescription: "A Volition-focused mode for asking what a goal, habit, or preference inherits.",
  whenToUse:
    "Use when the modelling question involves inherited pressure, institutions, preferences, lineages, or borrowed aims.",
  procedureSummary:
    "Focus on Volition. Choose Volition cards deliberately and ask what you inherited from whom, what institution, or what habit.",
  commentary:
    "Volition is chosen; every other domain is absent. The key prompt is: what did I inherit here?",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "A",
    Structure: "A",
    Chameleon: "A",
    Void: "A",
    Volition: "C",
    Aspect: "A"
  }),
  description:
    "Inheritance isolates Volition so influence, motivation, institutional pressure, and inherited priorities can be inspected directly.",
  setupInstructions: [
    "Use this anywhere people, institutions, or inherited aims are part of the problem.",
    "Open the Volition pile and choose cards deliberately.",
    "For each card, write or say: what did I inherit here?"
  ],
  nextStepHint: () => "Inspect the Volition pile and choose a card about inherited intention.",
  recommendedAction: () => ({
    label: "Inspect Volition pile",
    description: "Choose a Volition card and ask what influence or intention was inherited.",
    actionKind: "inspect-pile",
    domain: "Volition",
    subset: "full-domain"
  })
};
