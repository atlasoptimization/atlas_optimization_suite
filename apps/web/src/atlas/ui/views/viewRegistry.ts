import type { ComponentType } from "react";
import type { AtlasWorkbenchView } from "./AtlasMultiView";

export type AtlasViewDescriptor = {
  id: AtlasWorkbenchView;
  title: string;
  component?: ComponentType<Record<string, never>>;
  icon?: string;
  isAvailable?: () => boolean;
};

export const ATLAS_VIEW_REGISTRY: AtlasViewDescriptor[] = [
  { id: "object", title: "Object" },
  { id: "ir", title: "IR" },
  { id: "code", title: "CVXPY Code" },
  { id: "solution", title: "Solution" },
  { id: "diagnostics", title: "Diagnostics" }
];

export function getAtlasViewDescriptor(viewId: AtlasWorkbenchView) {
  return ATLAS_VIEW_REGISTRY.find((view) => view.id === viewId);
}

export function isAtlasWorkbenchView(value: string): value is AtlasWorkbenchView {
  return ATLAS_VIEW_REGISTRY.some((view) => view.id === value);
}

export function nextAtlasView(current: AtlasWorkbenchView) {
  const index = ATLAS_VIEW_REGISTRY.findIndex((view) => view.id === current);
  return ATLAS_VIEW_REGISTRY[(index + 1) % ATLAS_VIEW_REGISTRY.length]?.id ?? current;
}
