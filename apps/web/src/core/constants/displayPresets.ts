import type { CardDisplayPreset, CardDisplayPresetId } from "../types/displayPreset";

export const CARD_DISPLAY_PRESETS: CardDisplayPreset[] = [
  {
    id: "standard",
    label: "Standard: front + back + active",
    displayMode: "card-face-and-active-effect",
    face: "both"
  },
  {
    id: "pdf-front-back-active",
    label: "PDF front + back + active",
    displayMode: "card-face-and-active-effect",
    face: "both"
  },
  {
    id: "pdf-front-active",
    label: "Front + active",
    displayMode: "card-face-and-active-effect",
    face: "front"
  },
  {
    id: "pdf-front",
    label: "PDF front",
    displayMode: "card-face",
    face: "front"
  },
  {
    id: "pdf-back",
    label: "PDF back",
    displayMode: "card-face",
    face: "back"
  },
  {
    id: "question",
    label: "Question only",
    displayMode: "question"
  },
  {
    id: "scientific",
    label: "Scientific twin",
    displayMode: "scientific-twin"
  },
  {
    id: "compact",
    label: "Compact name",
    displayMode: "compact-name"
  },
  {
    id: "text-card",
    label: "Text card",
    displayMode: "text-card"
  },
  {
    id: "original",
    label: "Original",
    displayMode: "full-card-image"
  }
];

export const NEW_CARD_DISPLAY_PRESETS = CARD_DISPLAY_PRESETS.filter(
  (preset) => preset.id !== "original" && preset.id !== "pdf-front-back-active"
);

export const BOARD_DISPLAY_PRESETS = CARD_DISPLAY_PRESETS.filter(
  (preset) => preset.id !== "pdf-front-back-active"
);

export function getCardDisplayPreset(id: CardDisplayPresetId): CardDisplayPreset {
  return CARD_DISPLAY_PRESETS.find((preset) => preset.id === id) ?? CARD_DISPLAY_PRESETS[0];
}
