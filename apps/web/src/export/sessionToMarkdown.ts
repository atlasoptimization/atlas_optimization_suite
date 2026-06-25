import type { DeckCard } from "../core/types/card";
import type { GameMode } from "../core/types/mode";
import type {
  ArrowObject,
  CardInstance,
  NoteObject,
  Orientation,
  SessionLogEntry,
  SessionState
} from "../core/types/session";
import { getEffectModWithAspectFallback } from "../core/constants/aspect";

type SessionMarkdownInput = {
  session: SessionState;
  cardsById: Map<string, DeckCard>;
  modes: GameMode[];
};

function text(value: string | undefined | null, fallback = "") {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function escapeMarkdown(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
}

function headingText(value: string) {
  return value.replace(/#/g, "\\#");
}

function formatTimestamp(value: string | undefined) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function getActiveEffect(card: DeckCard, orientation: Orientation) {
  if (orientation === "reversed") return text(card.effectBad, card.cardname);
  if (orientation === "modifier") {
    return text(getEffectModWithAspectFallback(card.domain, card.effectMod), card.cardname);
  }
  if (orientation === "question") return text(card.question, text(card.summary, card.cardname));
  return text(card.effectGood, card.cardname);
}

function getInstanceNotes(instance: CardInstance, notes: NoteObject[]) {
  return notes.filter((note) => note.attachedTo === instance.instanceId);
}

function groupCardsByDomain(session: SessionState, cardsById: Map<string, DeckCard>) {
  const groups = new Map<string, CardInstance[]>();

  for (const instance of session.tableau) {
    const card = cardsById.get(instance.cardId);
    const domain = card?.domain || "Missing";
    groups.set(domain, [...(groups.get(domain) ?? []), instance]);
  }

  return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
}

function formatDomainVector(mode: GameMode | undefined) {
  if (!mode) return ["_No active mode found._"];

  return Object.entries(mode.domainVector).map(
    ([domain, value]) => `- ${escapeMarkdown(domain)}: ${value}`
  );
}

function formatSessionLog(log: SessionLogEntry[]) {
  if (log.length === 0) return ["_No session log entries._"];

  return log.map((entry) => {
    const details = [
      entry.domain ? `domain: ${entry.domain}` : "",
      entry.cardId ? `card: ${entry.cardId}` : "",
      entry.instanceId ? `instance: ${entry.instanceId}` : ""
    ].filter(Boolean);
    const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";

    return `- ${formatTimestamp(entry.timestamp)} - ${escapeMarkdown(entry.label)}${suffix}`;
  });
}

function formatCardInstance(
  instance: CardInstance,
  card: DeckCard | undefined,
  notes: NoteObject[]
) {
  if (!card) {
    return [
      `### Missing card (${instance.cardId})`,
      "",
      `- Orientation: ${instance.orientation}`,
      `- Display mode: ${instance.displayMode}`,
      "",
      "_This card definition is not available in the current deck._"
    ];
  }

  const instanceNotes = getInstanceNotes(instance, notes);
  const lines = [
    `### ${headingText(card.cardname)}`,
    "",
    `- Domain: ${escapeMarkdown(card.domain)}${card.subdomain ? ` / ${escapeMarkdown(card.subdomain)}` : ""}`,
    `- Orientation: ${instance.orientation}`,
    `- Display mode: ${instance.displayMode}`,
    `- Scientific twin: ${text(card.twin, "_None_")}`,
    `- Active effect: ${text(getActiveEffect(card, instance.orientation), "_None_")}`
  ];

  if (instanceNotes.length > 0) {
    lines.push("", "Instance notes:");
    for (const note of instanceNotes) {
      lines.push(`- ${escapeMarkdown(note.noteKind)}: ${text(note.text, "_Blank note_")}`);
    }
  }

  return lines;
}

function formatFreeNotes(notes: NoteObject[]) {
  const freeNotes = notes.filter((note) => !note.attachedTo);
  if (freeNotes.length === 0) return ["_No free notes._"];

  return freeNotes.map((note) => `- ${escapeMarkdown(note.noteKind)}: ${text(note.text, "_Blank note_")}`);
}

function formatArrows(arrows: ArrowObject[]) {
  if (arrows.length === 0) return ["_No arrows or shape annotations._"];

  return arrows.map((arrow) => {
    const label = text(arrow.label, "unlabelled arrow");
    return `- ${escapeMarkdown(label)}: (${Math.round(arrow.x1)}, ${Math.round(arrow.y1)}) -> (${Math.round(arrow.x2)}, ${Math.round(arrow.y2)})`;
  });
}

export function sessionToMarkdown({ session, cardsById, modes }: SessionMarkdownInput) {
  const activeMode = modes.find((mode) => mode.id === session.activeModeId);
  const synthesis = session.synthesis ?? {};
  const lines = [
    `# ${headingText(text(session.title, "Untitled session"))}`,
    "",
    `Exported: ${new Date().toISOString()}`,
    `Created: ${formatTimestamp(session.createdAt)}`,
    `Updated: ${formatTimestamp(session.updatedAt)}`,
    "",
    "## Question",
    text(session.question, "_No question recorded._"),
    "",
    "## Context",
    text(session.context, "_No context recorded._"),
    "",
    "## Active Mode",
    activeMode ? `${activeMode.name} (${activeMode.id})` : text(session.activeModeId, "_None_"),
    "",
    "### Domain Vector",
    ...formatDomainVector(activeMode),
    "",
    "## Desk Snapshot",
    "Use File -> Export desk as PNG to save a visual snapshot of the current tableau. Keep the PNG beside this Markdown report if you need a complete session archive.",
    "",
    "## Session Log",
    ...formatSessionLog(session.log),
    "",
    "## Placed Cards"
  ];

  const groupedCards = groupCardsByDomain(session, cardsById);
  if (groupedCards.length === 0) {
    lines.push("_No placed cards._");
  }

  for (const [domain, instances] of groupedCards) {
    lines.push("", `## ${headingText(domain)}`);
    for (const instance of instances) {
      lines.push("", ...formatCardInstance(instance, cardsById.get(instance.cardId), session.notes));
    }
  }

  lines.push(
    "",
    "## Free Notes",
    ...formatFreeNotes(session.notes),
    "",
    "## Arrows / Shapes",
    ...formatArrows(session.arrows),
    "",
    "## Synthesis",
    `- Expected: ${text(synthesis.expected)}`,
    `- Surprise: ${text(synthesis.surprise)}`,
    `- Noteworthy: ${text(synthesis.noteworthy)}`,
    `- Insight: ${text(synthesis.insight)}`,
    "",
    "## Conclusion",
    text(session.conclusion, "_No conclusion recorded._"),
    "",
    "## Next Move",
    text(session.nextMove, "_No next move recorded._")
  );

  return `${lines.join("\n")}\n`;
}
