import type { DeckCard } from "../core/types/card";
import type { GameMode } from "../core/types/mode";
import type { SessionState } from "../core/types/session";
import { domainVector } from "./modeDomain";

function step(state: SessionState) {
  const value = state.modeProgress["void-cartography"]?.step;
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function normalized(value: string | undefined) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isVoidGeometryOrDynamics(card: DeckCard) {
  if (card.domain !== "Void") return false;
  const text = normalized(card.subdomain);
  return text.includes("geometry") || text.includes("dynamics");
}

function candidateRefs(state: SessionState, cards: DeckCard[] | undefined, domain: string) {
  const pile = state.piles.find((candidate) => candidate.domain === domain);
  if (!pile) return [];
  const cardsById = new Map((cards ?? []).map((card) => [card.id, card]));

  return pile.currentOrder
    .map((cardId) => cardsById.get(cardId))
    .filter((card): card is DeckCard => Boolean(card))
    .filter((card) => domain !== "Void" || isVoidGeometryOrDynamics(card))
    .slice(0, 5)
    .map((card) => ({ cardId: card.id, domain: card.domain }));
}

export const voidCartographyMode: GameMode = {
  id: "void-cartography",
  name: "Void Cartography",
  purpose: "Map the shape of the missing",
  shortDescription: "A spatial mode using restricted Void Geometry/Dynamics cards and Aspect modifiers.",
  whenToUse:
    "Use when absence has shape: geometry, dynamics, boundary, motion, or changing negative space.",
  procedureSummary:
    "Alternate reveal-five-place-one rounds: restricted Void Geometry/Dynamics candidates, then Aspect modifier candidates. Repeat.",
  commentary:
    "Source, Structure, Chameleon, and Volition are absent. Void and Aspect do the work: Void maps missing geometry/dynamics, Aspect supplies a modifier lens.",
  automationStatus: "implemented",
  domainVector: domainVector({
    Source: "A",
    Structure: "A",
    Chameleon: "A",
    Void: "R",
    Volition: "A",
    Aspect: "R"
  }),
  description:
    "Void Cartography turns missing space into a map. Draw Void geometry/dynamics and Aspect lenses, then place them as boundaries, flows, gaps, and distortions.",
  setupInstructions: [
    "Use a cluttered, chaotic desk or a deliberately messy map surface.",
    "Draw five restricted Void Geometry/Dynamics candidates and keep one.",
    "Draw five Aspect candidates and keep one as the modifier lens.",
    "Repeat the Void/Aspect cycle and arrange cards spatially."
  ],
  nextStepHint: (state) => {
    const domain = step(state) % 2 === 0 ? "Void" : "Aspect";
    return domain === "Void"
      ? "Choose 1 from 5 Void Geometry/Dynamics candidates."
      : "Choose 1 from 5 Aspect modifier candidates.";
  },
  recommendedAction: (state, cards) => {
    const currentStep = step(state);
    const preferredDomain = currentStep % 2 === 0 ? "Void" : "Aspect";
    const fallbackDomain = preferredDomain === "Void" ? "Aspect" : "Void";
    const domain = candidateRefs(state, cards, preferredDomain).length > 0
      ? preferredDomain
      : fallbackDomain;
    const candidates = candidateRefs(state, cards, domain);

    if (candidates.length === 0) {
      return {
        label: `${domain} cartography complete`,
        description:
          domain === "Void"
            ? "No available Void Geometry or Void Dynamics cards remain."
            : "No available Aspect cards remain.",
        actionKind: "complete"
      };
    }

    return {
      label: `Choose 1 from 5 ${domain}`,
      description:
        domain === "Void"
          ? "Reveal up to five Void Geometry/Dynamics candidates and keep one map card."
          : "Reveal up to five Aspect candidates and keep one modifier lens.",
      actionKind: "choose-filtered-candidates",
      domain,
      cards: candidates,
      count: 5,
      drawMode: "choose-1-from-n",
      subset: domain === "Void" ? "geometry-dynamics" : "full-domain",
      progressUpdates: { step: currentStep + 1 }
    };
  }
};

export const voidCartographyTestExports = {
  isVoidGeometryOrDynamics
};
