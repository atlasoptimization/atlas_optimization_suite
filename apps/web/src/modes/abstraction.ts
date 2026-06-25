import type { GameMode } from "../core/types/mode";
import { domainVector } from "./modeDomain";

export const abstractionMode: GameMode = {
  id: "abstraction",
  name: "Abstraction",
  purpose: "Think about an arbitrary topic through Aspect modifier prompts",
  shortDescription: "Aspect-only mode for turning a topic into reusable questions and modifier prompts.",
  whenToUse:
    "Use when the subject is not yet a deck object, or when you want a compact conceptual exercise around one topic.",
  procedureSummary:
    "First write a note with the question, topic, or keyword. Then draw Aspect cards and apply each Aspect keyword as x(y).",
  commentary:
    "Source/Structure/Chameleon/Void/Volition are absent; Aspect is random. Aspect has no board space, so place Aspect cards in the staging lane and attach notes to the target topic.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "A",
    Structure: "A",
    Chameleon: "A",
    Void: "A",
    Volition: "A",
    Aspect: "R"
  }),
  description:
    "Abstraction uses Aspect cards as modifier prompts rather than ordinary domain content.",
  setupInstructions: [
    "Write the topic as a note, object, or short phrase.",
    "Draw Aspect cards and choose a keyword or interpretation angle.",
    "Record the Aspect form x(y), where x is the Aspect keyword and y is the target topic."
  ],
  nextStepHint: (state) =>
    state.modeProgress["abstraction"]?.topicNotePlaced === true
      ? "Draw an Aspect card and write an x(y) note for your topic."
      : "Place a note with the question, topic, or keyword first.",
  recommendedAction: (state) =>
    state.modeProgress["abstraction"]?.topicNotePlaced === true
      ? {
          label: "Draw Aspect card",
          description: "Draw one random Aspect card and apply it as x(y) to the noted target y.",
          actionKind: "draw-random",
          domain: "Aspect",
          drawMode: "random-1",
          subset: "full-domain"
        }
      : {
          label: "Add topic note",
          description: "Question, topic, or keyword: ",
          actionKind: "create-note",
          progressUpdates: { topicNotePlaced: true }
        }
};
