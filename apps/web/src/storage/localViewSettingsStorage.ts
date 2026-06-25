import type {
  CardDisplayMode,
  TableauCardSize,
  TopologyImageSource,
  ViewSettings,
  ViewTheme,
  ZoneVisibility
} from "../core/types/view";
import type { CardDisplayPresetId } from "../core/types/displayPreset";
import { DEFAULT_CARD_DISPLAY_MODE } from "../core/constants/cardDisplay";
import { CARD_DISPLAY_PRESETS } from "../core/constants/displayPresets";

const STORAGE_KEY = "dsd.viewSettings";

const themes: ViewTheme[] = ["dark", "light", "scientific", "ritual"];
const displayModes: CardDisplayMode[] = [
  "full-card-image",
  "pdf-front",
  "pdf-back",
  "pdf-both",
  "card-face",
  "card-face-and-active-effect",
  "compact-name",
  "scientific-twin",
  "active-effect",
  "question",
  "flavor-text",
  "text-card"
];
const cardSizes: TableauCardSize[] = ["small", "medium", "large"];
const zoneVisibilities: ZoneVisibility[] = ["hidden", "subtle", "normal", "strong"];
const topologyImageSources: TopologyImageSource[] = ["none", "thematic", "zonal", "uniform"];
const displayPresetIds = CARD_DISPLAY_PRESETS.map((preset) => preset.id);

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  theme: "dark",
  defaultCardDisplayMode: DEFAULT_CARD_DISPLAY_MODE,
  defaultCardDisplayPreset: "standard",
  cardSize: "medium",
  showDomainZones: true,
  zoneVisibility: "normal",
  topologyImageSource: "none",
  showGrid: true,
  showInspector: true,
  showBrowser: true,
  // Public builds may set showCustomAssets default to false from a future build profile.
  showCustomAssets: true,
  showPileBar: true,
  showMinimap: true,
  showTimer: false,
  showMythicNames: true,
  showScientificNames: false,
  showKeywords: false,
  enableVisualEffects: true,
  pileOverlayScale: 1,
  choicePreviewScale: 1,
  nextPanelPosition: null
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function booleanField(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function clampOverlayScale(value: unknown, fallback = 1) {
  const scale = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.min(2, Math.max(0.75, scale));
}

export function normalizeOverlayPosition(value: unknown) {
  if (!isRecord(value)) return null;
  const x = typeof value.x === "number" && Number.isFinite(value.x) ? value.x : null;
  const y = typeof value.y === "number" && Number.isFinite(value.y) ? value.y : null;
  if (x === null || y === null) return null;
  return {
    x: Math.max(8, Math.round(x)),
    y: Math.max(8, Math.round(y))
  };
}

export function loadViewSettings(): ViewSettings {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_VIEW_SETTINGS;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_VIEW_SETTINGS;

    return {
      theme: themes.includes(parsed.theme as ViewTheme)
        ? (parsed.theme as ViewTheme)
        : DEFAULT_VIEW_SETTINGS.theme,
      defaultCardDisplayMode: displayModes.includes(
        parsed.defaultCardDisplayMode as CardDisplayMode
      )
        ? (parsed.defaultCardDisplayMode as CardDisplayMode)
        : DEFAULT_VIEW_SETTINGS.defaultCardDisplayMode,
      defaultCardDisplayPreset: displayPresetIds.includes(
        parsed.defaultCardDisplayPreset as CardDisplayPresetId
      )
        ? (parsed.defaultCardDisplayPreset as CardDisplayPresetId)
        : displayPresetFromLegacyMode(parsed.defaultCardDisplayMode as CardDisplayMode),
      cardSize: cardSizes.includes(parsed.cardSize as TableauCardSize)
        ? (parsed.cardSize as TableauCardSize)
        : DEFAULT_VIEW_SETTINGS.cardSize,
      showDomainZones: booleanField(
        parsed.showDomainZones,
        DEFAULT_VIEW_SETTINGS.showDomainZones
      ),
      zoneVisibility: zoneVisibilities.includes(parsed.zoneVisibility as ZoneVisibility)
        ? (parsed.zoneVisibility as ZoneVisibility)
        : DEFAULT_VIEW_SETTINGS.zoneVisibility,
      topologyImageSource: topologyImageSources.includes(
        parsed.topologyImageSource as TopologyImageSource
      )
        ? (parsed.topologyImageSource as TopologyImageSource)
        : DEFAULT_VIEW_SETTINGS.topologyImageSource,
      showGrid: booleanField(parsed.showGrid, DEFAULT_VIEW_SETTINGS.showGrid),
      showInspector: booleanField(
        parsed.showInspector,
        DEFAULT_VIEW_SETTINGS.showInspector
      ),
      showBrowser: booleanField(parsed.showBrowser, DEFAULT_VIEW_SETTINGS.showBrowser),
      showCustomAssets: booleanField(
        parsed.showCustomAssets,
        DEFAULT_VIEW_SETTINGS.showCustomAssets
      ),
      showPileBar: booleanField(parsed.showPileBar, DEFAULT_VIEW_SETTINGS.showPileBar),
      showMinimap: booleanField(parsed.showMinimap, DEFAULT_VIEW_SETTINGS.showMinimap),
      showTimer: booleanField(parsed.showTimer, DEFAULT_VIEW_SETTINGS.showTimer),
      showMythicNames: booleanField(
        parsed.showMythicNames,
        DEFAULT_VIEW_SETTINGS.showMythicNames
      ),
      showScientificNames: booleanField(
        parsed.showScientificNames,
        DEFAULT_VIEW_SETTINGS.showScientificNames
      ),
      showKeywords: booleanField(parsed.showKeywords, DEFAULT_VIEW_SETTINGS.showKeywords),
      enableVisualEffects: booleanField(
        parsed.enableVisualEffects,
        DEFAULT_VIEW_SETTINGS.enableVisualEffects
      ),
      pileOverlayScale: clampOverlayScale(
        parsed.pileOverlayScale,
        DEFAULT_VIEW_SETTINGS.pileOverlayScale
      ),
      choicePreviewScale: clampOverlayScale(
        parsed.choicePreviewScale,
        DEFAULT_VIEW_SETTINGS.choicePreviewScale
      ),
      nextPanelPosition: normalizeOverlayPosition(parsed.nextPanelPosition)
    };
  } catch {
    return DEFAULT_VIEW_SETTINGS;
  }
}

function displayPresetFromLegacyMode(displayMode: CardDisplayMode): CardDisplayPresetId {
  if (displayMode === "pdf-front" || displayMode === "card-face") return "pdf-front";
  if (displayMode === "pdf-back") return "pdf-back";
  if (displayMode === "pdf-both" || displayMode === "card-face-and-active-effect") {
    return "standard";
  }
  if (displayMode === "question") return "question";
  if (displayMode === "scientific-twin") return "scientific";
  if (displayMode === "compact-name") return "compact";
  if (displayMode === "text-card") return "text-card";
  const preset = CARD_DISPLAY_PRESETS.find(
    (candidate) => candidate.id !== "original" && candidate.displayMode === displayMode
  );
  return preset?.id ?? DEFAULT_VIEW_SETTINGS.defaultCardDisplayPreset;
}

export function saveViewSettings(settings: ViewSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
