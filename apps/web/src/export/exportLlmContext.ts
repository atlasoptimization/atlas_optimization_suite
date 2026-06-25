import { getEffectModWithAspectFallback } from "../core/constants/aspect";
import type { DeckCard } from "../core/types/card";
import type { GameMode } from "../core/types/mode";
import type { Orientation, SessionState } from "../core/types/session";

const LLM_INSTRUCTION =
  "Recommend an interpretation scientifically; do not treat this as fortune telling.";

export type LlmSessionContext = ReturnType<typeof buildLlmSessionContext>;

export function buildLlmSessionContext({
  session,
  cardsById,
  activeMode
}: {
  session: SessionState;
  cardsById: Map<string, DeckCard>;
  activeMode: GameMode | null;
}) {
  return {
    instruction: LLM_INSTRUCTION,
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
            purpose: activeMode.purpose,
            setupInstructions: activeMode.setupInstructions,
            whenToUse: activeMode.whenToUse ?? "",
            domainVector: activeMode.domainVector,
            procedureSummary: activeMode.procedureSummary ?? "",
            commentary: activeMode.commentary ?? ""
          }
        : null,
      synthesis: session.synthesis ?? {},
      conclusion: session.conclusion ?? "",
      nextMove: session.nextMove ?? ""
    },
    placedCards: session.tableau.map((instance) => {
      const card = cardsById.get(instance.cardId);

      return {
        instanceId: instance.instanceId,
        cardId: instance.cardId,
        cardname: card?.cardname ?? "Missing card",
        domain: card?.domain ?? "Missing",
        subdomain: card?.subdomain ?? "",
        orientation: instance.orientation,
        activeEffect: getActiveEffect(card, instance.orientation),
        position: {
          x: Math.round(instance.x),
          y: Math.round(instance.y)
        },
        scale: instance.scale,
        hidden: instance.hidden,
        ablated: instance.ablated,
        zone: roughZone(instance.x, instance.y),
        card: card ? sanitizeCard(card) : null
      };
    }),
    notes: session.notes.map((note) => ({
      id: note.id,
      type: note.noteKind,
      text: note.text,
      position: {
        x: Math.round(note.x),
        y: Math.round(note.y)
      },
      attachedTo: note.attachedTo
    })),
    arrows: session.arrows.map((arrow) => ({
      id: arrow.id,
      x1: Math.round(arrow.x1),
      y1: Math.round(arrow.y1),
      x2: Math.round(arrow.x2),
      y2: Math.round(arrow.y2),
      label: arrow.label ?? "",
      strokeWidth: arrow.strokeWidth ?? 4
    })),
    sessionLog: session.log
  };
}

export function llmSessionContextToMarkdown(context: LlmSessionContext): string {
  return [
    "# Data Science Deck LLM Context",
    "",
    context.instruction,
    "",
    "```json",
    JSON.stringify(context, null, 2),
    "```"
  ].join("\n");
}

export function buildModeRecommendationPrompt(modes: GameMode[], questionContext = "") {
  const modeSummaries = modes.map((mode) => ({
    id: mode.id,
    name: mode.name,
    category: mode.category ?? "Uncategorized",
    purpose: mode.purpose,
    setupInstructions: mode.setupInstructions,
    whenToUse: mode.whenToUse ?? "",
    domainVector: mode.domainVector,
    procedure: mode.procedureSummary ?? ""
  }));

  return [
    "# Data Science Deck Mode Recommendation Context",
    "",
    "This app does not call a browser-local AI API. Paste this context into ChatGPT or another assistant with your modelling question.",
    "",
    "The deck is a compact tool for structured thinking.",
    "",
    "Domain status code legend: A = Absent, F = Fixed, C = Chosen, R = Random.",
    "",
    "Recommend one or two Data Science Deck game modes scientifically; do not treat this as fortune telling.",
    "Explain why each recommended mode fits the question, and mention which domains will be fixed, chosen, random, or absent.",
    "",
    "User modelling question:",
    "",
    questionContext.trim() || "[Paste your question, decision, dataset, model, or situation here.]",
    "",
    "Available modes:",
    "",
    "```json",
    JSON.stringify(modeSummaries, null, 2),
    "```"
  ].join("\n");
}

function sanitizeCard(card: DeckCard) {
  return {
    id: card.id,
    cardname: card.cardname,
    domain: card.domain,
    subdomain: card.subdomain,
    summary: card.summary,
    twin: card.twin,
    keywords: card.keywords,
    question: card.question,
    story: card.story,
    effectGood: card.effectGood,
    effectBad: card.effectBad,
    effectMod: card.effectMod,
    raw: sanitizeRaw(card.raw)
  };
}

function sanitizeRaw(raw: Record<string, unknown>) {
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

function getActiveEffect(card: DeckCard | undefined, orientation: Orientation) {
  if (!card) return "";
  if (card.domain === "Aspect") return getEffectModWithAspectFallback(card.domain, card.effectMod);
  if (orientation === "reversed") return card.effectBad || card.cardname;
  if (orientation === "modifier") {
    return getEffectModWithAspectFallback(card.domain, card.effectMod) || card.cardname;
  }
  if (orientation === "question") return card.question || card.summary || card.cardname;
  return card.effectGood || card.cardname;
}

function roughZone(x: number, y: number) {
  if (y >= 980) return "Source";
  if (y <= 340) return "Volition";
  if (x < 1080 && y >= 430 && y <= 870) return "Chameleon";
  if (x >= 1080 && y >= 430 && y <= 870) return "Structure";
  if (y > 340 && y < 980) return "Void";
  return "Unclassified";
}

function looksLikePrivatePath(value: string) {
  return value.startsWith("/") || /^[a-z]:\\/i.test(value);
}
