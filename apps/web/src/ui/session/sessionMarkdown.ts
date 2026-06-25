import type { SessionState } from "../../core/types/session";

export function createSessionMarkdown(session: SessionState): string {
  const synthesis = session.synthesis ?? {};

  return [
    `# ${session.title || "Untitled session"}`,
    "",
    `Created: ${session.createdAt}`,
    `Updated: ${session.updatedAt}`,
    `Mode: ${session.activeModeId ?? "none"}`,
    "",
    "## Question",
    session.question || "_No question recorded._",
    "",
    "## Context",
    session.context || "_No context recorded._",
    "",
    "## Synthesis",
    `- Expected: ${synthesis.expected || ""}`,
    `- Surprise: ${synthesis.surprise || ""}`,
    `- Noteworthy: ${synthesis.noteworthy || ""}`,
    `- Insight: ${synthesis.insight || ""}`,
    "",
    "## Conclusion",
    session.conclusion || "",
    "",
    "## Next Move",
    session.nextMove || "",
    "",
    "## Board",
    `- Cards: ${session.tableau.length}`,
    `- Notes: ${session.notes.length}`
  ].join("\n");
}
