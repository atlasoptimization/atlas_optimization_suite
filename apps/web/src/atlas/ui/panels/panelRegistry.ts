import type { ComponentType } from "react";

export type AtlasPanelRegion = "left" | "right" | "bottom";

export type AtlasPanelDescriptor = {
  id: string;
  title: string;
  region: AtlasPanelRegion;
  component?: ComponentType<Record<string, never>>;
  defaultOpen: boolean;
  defaultSize?: number;
};

export const ATLAS_PANEL_REGISTRY: AtlasPanelDescriptor[] = [
  { id: "constructor", title: "Constructor", region: "left", defaultOpen: true, defaultSize: 290 },
  { id: "explorer", title: "Explorer", region: "left", defaultOpen: true, defaultSize: 290 },
  { id: "inspector", title: "Inspector", region: "right", defaultOpen: true, defaultSize: 390 },
  { id: "solution", title: "Solution", region: "right", defaultOpen: true, defaultSize: 390 },
  { id: "objectives", title: "Objectives", region: "bottom", defaultOpen: true },
  { id: "constraints", title: "Constraints", region: "bottom", defaultOpen: true }
];

export type AtlasPanelState = Record<string, boolean>;

export function defaultAtlasPanelState() {
  return Object.fromEntries(ATLAS_PANEL_REGISTRY.map((panel) => [panel.id, panel.defaultOpen]));
}

export function toggleAtlasPanel(state: AtlasPanelState, panelId: string): AtlasPanelState {
  return { ...state, [panelId]: !state[panelId] };
}

export function panelsForRegion(region: AtlasPanelRegion) {
  return ATLAS_PANEL_REGISTRY.filter((panel) => panel.region === region);
}
