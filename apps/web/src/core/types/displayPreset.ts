import type { CardDisplayMode, CardFace } from "./view";

export type CardDisplayPresetId =
  | "standard"
  | "pdf-front-back-active"
  | "pdf-front-active"
  | "pdf-front"
  | "pdf-back"
  | "question"
  | "scientific"
  | "compact"
  | "text-card"
  | "original";

export type CardDisplayPreset = {
  id: CardDisplayPresetId;
  label: string;
  description?: string;
  displayMode: CardDisplayMode;
  face?: CardFace;
};
