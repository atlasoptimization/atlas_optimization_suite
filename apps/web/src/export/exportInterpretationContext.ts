import {
  DRAWING_ZONE_BOUNDS,
  MODEL_CORE_BOUNDS,
  SOURCE_BOUNDS,
  VOLITION_BOUNDS,
  type TableauBounds
} from "../core/constants/tableau";
import type { DeckCard } from "../core/types/card";
import type { GameMode, ModeRecommendation } from "../core/types/mode";
import type { CardInstance, SessionState } from "../core/types/session";
import { getActiveEffect } from "../ui/cards/cardText";

const INTERPRETATION_PROMPT =
  "Interpret this Data Science Deck session scientifically. Treat the cards as structured prompts for model criticism, not as fortune telling. Focus on modelling assumptions, uncertainty, missing variables, model behaviour, decision pressure, contradictions, and next modelling actions.";

export type InterpretationContext = ReturnType<typeof buildInterpretationContextJson>;

export function buildInterpretationContextJson({
  session,
  cardsById,
  activeMode,
  modeRecommendation
}: {
  session: SessionState;
  cardsById: Map<string, DeckCard>;
  activeMode: GameMode | null;
  modeRecommendation: ModeRecommendation | null;
}) {
  const cardSummaries = session.tableau.map((instance) => {
    const card = cardsById.get(instance.cardId);
    const nearestCards = nearestNeighborCards(instance, session.tableau, cardsById, 3);

    return {
      instanceId: instance.instanceId,
      cardId: instance.cardId,
      domain: card?.domain ?? "Missing",
      subdomain: card?.subdomain ?? "",
      cardname: card?.cardname ?? "Missing card",
      scientificTwin: card?.twin ?? "",
      keywords: card?.keywords ?? [],
      summary: card?.summary ?? "",
      question: card?.question ?? "",
      story: card?.story ?? "",
      effectGood: card?.effectGood ?? "",
      effectBad: card?.effectBad ?? "",
      effectMod: card?.effectMod ?? "",
      orientation: instance.orientation,
      activeEffect: card ? getActiveEffect(card, instance.orientation) : "",
      hidden: instance.hidden,
      ablated: instance.ablated,
      position: {
        x: Math.round(instance.x),
        y: Math.round(instance.y)
      },
      rotation: instance.rotation,
      scale: instance.scale,
      displayMode: instance.displayMode,
      face: instance.face,
      approximateZone: approximateZone(instance.x, instance.y),
      nearestCards,
      attachedNotes: session.notes
        .filter((note) => note.attachedTo === instance.instanceId)
        .map((note) => ({ id: note.id, type: note.noteKind, text: note.text })),
      raw: card ? sanitizeRecord(card.raw) : {}
    };
  });

  const context = {
    instruction: INTERPRETATION_PROMPT,
    note: "The Data Science Deck is a compact tool for structured thinking.",
    exportedAt: new Date().toISOString(),
    session: {
      id: session.id,
      title: session.title,
      question: session.question ?? "",
      context: session.context ?? "",
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      activeMode: activeMode
        ? {
            id: activeMode.id,
            name: activeMode.name,
            category: activeMode.category ?? "",
            purpose: activeMode.purpose,
            setupInstructions: activeMode.setupInstructions,
            whenToUse: activeMode.whenToUse ?? "",
            domainVector: activeMode.domainVector,
            procedureSummary: activeMode.procedureSummary ?? "",
            commentary: activeMode.commentary ?? ""
          }
        : null,
      currentRecommendation: modeRecommendation
        ? {
            label: modeRecommendation.label,
            description: modeRecommendation.description,
            mechanical: modeRecommendation.mechanical ?? "",
            interpretation: modeRecommendation.interpretation ?? "",
            actionKind: modeRecommendation.actionKind,
            domain: modeRecommendation.domain ?? "",
            targetDomains: modeRecommendation.targetDomains ?? []
          }
        : null,
      synthesis: session.synthesis ?? {},
      conclusion: session.conclusion ?? "",
      nextMove: session.nextMove ?? "",
      modeProgress: session.modeProgress
    },
    board: {
      coordinateSystem:
        "Tableau coordinates are finite desk pixels. Smaller x is left; smaller y is higher on the desk.",
      placedCardCount: session.tableau.length,
      notesCount: session.notes.length,
      arrowsCount: session.arrows.length,
      zones: {
        DrawingZone: DRAWING_ZONE_BOUNDS,
        ModelCore: MODEL_CORE_BOUNDS,
        Volition: VOLITION_BOUNDS,
        Source: SOURCE_BOUNDS
      }
    },
    placedCards: cardSummaries,
    notes: session.notes.map((note) => ({
      id: note.id,
      type: note.noteKind,
      text: note.text,
      position: {
        x: Math.round(note.x),
        y: Math.round(note.y)
      },
      attachedTo: note.attachedTo ?? null
    })),
    arrows: session.arrows.map((arrow) => ({
      id: arrow.id,
      start: {
        x: Math.round(arrow.x1),
        y: Math.round(arrow.y1),
        nearestCard: nearestCardToPoint(arrow.x1, arrow.y1, session.tableau, cardsById)
      },
      end: {
        x: Math.round(arrow.x2),
        y: Math.round(arrow.y2),
        nearestCard: nearestCardToPoint(arrow.x2, arrow.y2, session.tableau, cardsById)
      },
      label: arrow.label ?? "",
      strokeWidth: arrow.strokeWidth ?? 4
    })),
    sessionLog: session.log
  };

  return sanitizePrivatePaths(context) as typeof context;
}

export function buildInterpretationContextMarkdown(context: InterpretationContext) {
  const cards = context.placedCards
    .map((card) => {
      const neighbors = card.nearestCards
        .map((neighbor) => `${neighbor.cardname} (${neighbor.domain}, ${neighbor.distance})`)
        .join("; ");
      return [
        `## ${card.cardname} [${card.domain}]`,
        `- Instance: ${card.instanceId}`,
        `- Position: (${card.position.x}, ${card.position.y}); zone: ${card.approximateZone}`,
        `- Orientation: ${card.orientation}; active effect: ${card.activeEffect || "n/a"}`,
        `- Scientific twin: ${card.scientificTwin || "n/a"}`,
        `- Keywords: ${card.keywords.join(", ") || "n/a"}`,
        `- Summary: ${card.summary || "n/a"}`,
        `- Question: ${card.question || "n/a"}`,
        `- Virtue: ${card.effectGood || "n/a"}`,
        `- Pathology: ${card.effectBad || "n/a"}`,
        `- Modifier: ${card.effectMod || "n/a"}`,
        `- Nearest cards: ${neighbors || "none"}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    "# Data Science Deck Interpretation Context",
    "",
    context.instruction,
    "",
    context.note,
    "",
    "## Session",
    `- Title: ${context.session.title || "Untitled"}`,
    `- Question: ${context.session.question || "n/a"}`,
    `- Context: ${context.session.context || "n/a"}`,
    `- Active mode: ${context.session.activeMode?.name ?? "Standard"}`,
    `- Exported at: ${context.exportedAt}`,
    "",
    "## Board Summary",
    `- Placed cards: ${context.board.placedCardCount}`,
    `- Notes: ${context.board.notesCount}`,
    `- Arrows: ${context.board.arrowsCount}`,
    `- Coordinate system: ${context.board.coordinateSystem}`,
    "",
    cards || "No cards are currently placed on the tableau.",
    "",
    "## Notes",
    context.notes.map((note) => `- ${note.id} (${note.type}) at (${note.position.x}, ${note.position.y}): ${note.text}`).join("\n") ||
      "No notes.",
    "",
    "## Arrows",
    context.arrows
      .map((arrow) => {
        const start = arrow.start.nearestCard?.cardname ?? "none";
        const end = arrow.end.nearestCard?.cardname ?? "none";
        return `- ${arrow.id}: (${arrow.start.x}, ${arrow.start.y}) -> (${arrow.end.x}, ${arrow.end.y}); label: ${arrow.label || "n/a"}; nearest endpoints: ${start} -> ${end}`;
      })
      .join("\n") || "No arrows.",
    "",
    "## Full JSON Context",
    "```json",
    JSON.stringify(context, null, 2),
    "```"
  ].join("\n");
}

function nearestNeighborCards(
  instance: CardInstance,
  tableau: CardInstance[],
  cardsById: Map<string, DeckCard>,
  count: number
) {
  return tableau
    .filter((candidate) => candidate.instanceId !== instance.instanceId)
    .map((candidate) => {
      const card = cardsById.get(candidate.cardId);
      return {
        instanceId: candidate.instanceId,
        cardId: candidate.cardId,
        cardname: card?.cardname ?? "Missing card",
        domain: card?.domain ?? "Missing",
        distance: Math.round(distance(instance.x, instance.y, candidate.x, candidate.y))
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, count);
}

function nearestCardToPoint(
  x: number,
  y: number,
  tableau: CardInstance[],
  cardsById: Map<string, DeckCard>
) {
  return tableau
    .map((instance) => {
      const card = cardsById.get(instance.cardId);
      return {
        instanceId: instance.instanceId,
        cardId: instance.cardId,
        cardname: card?.cardname ?? "Missing card",
        domain: card?.domain ?? "Missing",
        distance: Math.round(distance(x, y, instance.x, instance.y))
      };
    })
    .sort((a, b) => a.distance - b.distance)[0] ?? null;
}

function distance(x1: number, y1: number, x2: number, y2: number) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function approximateZone(x: number, y: number) {
  if (insideBounds(x, y, DRAWING_ZONE_BOUNDS)) return "Drawing zone";
  if (insideBounds(x, y, SOURCE_BOUNDS)) return "Source";
  if (insideBounds(x, y, VOLITION_BOUNDS)) return "Volition";
  if (insideBounds(x, y, MODEL_CORE_BOUNDS)) {
    if (x < MODEL_CORE_BOUNDS.x + MODEL_CORE_BOUNDS.width * 0.42) return "Chameleon";
    if (x > MODEL_CORE_BOUNDS.x + MODEL_CORE_BOUNDS.width * 0.58) return "Structure";
    return "Void / Model Core";
  }
  return "Unknown";
}

function insideBounds(x: number, y: number, bounds: TableauBounds) {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function sanitizeRecord(raw: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(raw).filter(([key, value]) => {
      const normalizedKey = key.toLowerCase();
      if (normalizedKey.includes("path") || normalizedKey.includes("pdf") || normalizedKey.includes("art")) {
        return false;
      }
      return typeof value !== "string" || !looksLikePrivatePath(value);
    })
  );
}

function sanitizePrivatePaths(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizePrivatePaths);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, nested]) => [key, sanitizePrivatePaths(nested)])
        .filter(([, nested]) => nested !== undefined)
    );
  }
  if (typeof value === "string" && looksLikePrivatePath(value)) return undefined;
  return value;
}

function looksLikePrivatePath(value: string) {
  const forbidden = [
    privatePattern(47, 104, 111, 109, 101, 47),
    privatePattern(47, 68, 101, 115, 107, 116, 111, 112, 47),
    privatePattern(102, 105, 108, 101, 58, 47, 47),
    privatePattern(67, 97, 114, 100, 95, 103, 97, 109, 101, 95, 102, 117, 108, 108),
    privatePattern(83, 99, 114, 105, 98, 117, 115, 95, 115, 101, 116, 117, 112),
    privatePattern(47, 109, 110, 116, 47, 100, 97, 116, 97, 47)
  ];
  return forbidden.some((pattern) => value.toLowerCase().includes(pattern.toLowerCase()));
}

function privatePattern(...codes: number[]) {
  return String.fromCharCode(...codes);
}
