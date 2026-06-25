import type { TableauSummary } from "./tableauSummary";
import {
  INTERPRETATION_OUTPUT_SECTIONS,
  INTERPRETATION_PROTOCOL
} from "./interpretationProtocol";

export function buildInterpretationPrompt(context: TableauSummary): string {
  return [
    "# Data Science Deck Interpretation Context",
    "",
    "Use the following protocol:",
    ...INTERPRETATION_PROTOCOL.map((instruction) => `- ${instruction}`),
    "",
    "Return these sections:",
    ...INTERPRETATION_OUTPUT_SECTIONS.map((section) => `- ${section}`),
    "",
    "Session context JSON:",
    "```json",
    JSON.stringify(context, null, 2),
    "```"
  ].join("\n");
}
