import type { AtlasPosition } from "../../core/types";

export type AtlasDragPayload =
  | { kind: "modelObject"; modelObjectId: string }
  | { kind: "atomSpec"; json: string }
  | { kind: "module"; moduleKind: string };

export function canvasPointFromClient(
  client: AtlasPosition,
  viewport: AtlasPosition,
  scale: number
): AtlasPosition {
  const safeScale = scale || 1;
  return {
    x: (client.x - viewport.x) / safeScale,
    y: (client.y - viewport.y) / safeScale
  };
}

export function parseAtlasDragPayload(dataTransfer: Pick<DataTransfer, "getData">): AtlasDragPayload | null {
  const modelObjectId = dataTransfer.getData("application/x-atlas-model-object");
  if (modelObjectId) return { kind: "modelObject", modelObjectId };
  const atomJson = dataTransfer.getData("application/x-atlas-atom-spec");
  if (atomJson) return { kind: "atomSpec", json: atomJson };
  const moduleKind = dataTransfer.getData("application/x-atlas-module-kind");
  if (moduleKind) return { kind: "module", moduleKind };
  return null;
}
