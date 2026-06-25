import type { CardDisplayPresetId } from "./displayPreset";

export type CardDisplayMode =
  | "full-card-image"
  | "pdf-front"
  | "pdf-back"
  | "pdf-both"
  | "card-face"
  | "card-face-and-active-effect"
  | "compact-name"
  | "scientific-twin"
  | "active-effect"
  | "question"
  | "flavor-text"
  | "text-card";

export type CardFace = "front" | "back" | "both";

export type CardNameMode = "mythic" | "scientific" | "both";

export type ViewTheme = "dark" | "light" | "scientific" | "ritual";

export type TableauCardSize = "small" | "medium" | "large";
export type ZoneVisibility = "hidden" | "subtle" | "normal" | "strong";
export type TopologyImageSource = "none" | "thematic" | "zonal" | "uniform";

export type ViewSettings = {
  theme: ViewTheme;
  defaultCardDisplayMode: CardDisplayMode;
  defaultCardDisplayPreset: CardDisplayPresetId;
  cardSize: TableauCardSize;
  showDomainZones: boolean;
  zoneVisibility: ZoneVisibility;
  topologyImageSource: TopologyImageSource;
  showGrid: boolean;
  showInspector: boolean;
  showBrowser: boolean;
  showCustomAssets: boolean;
  showPileBar: boolean;
  showMinimap: boolean;
  showTimer: boolean;
  showMythicNames: boolean;
  showScientificNames: boolean;
  showKeywords: boolean;
  enableVisualEffects: boolean;
  pileOverlayScale: number;
  choicePreviewScale: number;
  nextPanelPosition: { x: number; y: number } | null;
};
