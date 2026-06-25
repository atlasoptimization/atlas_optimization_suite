import type { GameMode } from "../core/types/mode";
import { domainVector, getNextModeDomain } from "./modeDomain";

const TRACE_DOMAINS = ["Structure", "Chameleon", "Void"];

function traceStep(state: Parameters<NonNullable<GameMode["recommendedAction"]>>[0]) {
  const value = state.modeProgress["painters-trace"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

export const paintersTraceMode: GameMode = {
  id: "painters-trace",
  name: "Painter's Trace",
  purpose: "Nonverbal conversion into form",
  shortDescription: "A diagrammatic mode for turning model tension into marks, arrows, notes, and spatial traces.",
  whenToUse:
    "Use when verbal interpretation feels too stiff and the problem needs to become a drawing or diagram.",
  procedureSummary:
    "Choose a few Structure, Chameleon, and Void cards. For each card, make a quick trace: arrow, note, spatial mark, or sketch.",
  commentary:
    "Source, Volition, and Aspect are absent; Structure, Chameleon, and Void are chosen. Works especially well with physical cards / physical surroundings. In the app, interpret the quick drawing as much as the card text.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "A",
    Structure: "C",
    Chameleon: "C",
    Void: "C",
    Volition: "A",
    Aspect: "A"
  }),
  description:
    "Painter's Trace translates modelling into visible form. The desk becomes a place for traces, arrows, shapes, and quick nonverbal responses.",
  setupInstructions: [
    "Use a table and pen, or the app's notes and arrows.",
    "Choose cards from Structure, Chameleon, and Void.",
    "After each card, make a quick trace before explaining it in words."
  ],
  nextStepHint: (state) => {
    const step = traceStep(state);
    const domain = TRACE_DOMAINS[step % TRACE_DOMAINS.length];
    return `Choose a ${domain} card, then add a quick arrow, note, or trace.`;
  },
  recommendedAction: (state) => {
    const step = traceStep(state);
    const domain = getNextModeDomain(paintersTraceMode, {
      ...state.drawCycle,
      order: TRACE_DOMAINS,
      index: step % TRACE_DOMAINS.length
    }) || TRACE_DOMAINS[step % TRACE_DOMAINS.length];

    return {
      label: `Choose ${domain} trace card`,
      description: `Choose a ${domain} card, then respond with a quick arrow, note, shape, or spatial mark.`,
      actionKind: "choose-candidates",
      domain,
      count: 3,
      drawMode: "choose-1-from-n",
      subset: "full-domain",
      progressUpdates: { step: step + 1, hint: "add-trace" }
    };
  }
};
