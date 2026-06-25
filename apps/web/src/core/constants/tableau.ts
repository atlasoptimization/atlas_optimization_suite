import type { ArrowObject, CardInstance, NoteObject } from "../types/session";

export type TableauBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const TABLEAU_WIDTH = 3000;
export const TABLEAU_HEIGHT = 2200;
export const TABLEAU_CENTER = {
  x: TABLEAU_WIDTH / 2,
  y: TABLEAU_HEIGHT / 2
};

export const TABLEAU_DEFAULT_SCALE = 0.55;

export const ACTIVE_BOARD_BOUNDS = {
  x: TABLEAU_CENTER.x - 1220,
  y: TABLEAU_CENTER.y - 850,
  width: 2500,
  height: 1700
};

export const TABLEAU_DEFAULT_VIEW_BOUNDS = ACTIVE_BOARD_BOUNDS;

export const TABLEAU_DEFAULT_VIEW_FILL = 0.78;
export const TABLEAU_FIT_PADDING = 120;

export const DRAWING_ZONE_BOUNDS = {
  x: TABLEAU_CENTER.x - 1180,
  y: TABLEAU_CENTER.y - 790,
  width: 540,
  height: 1520
};

export const MODEL_CORE_BOUNDS = {
  x: TABLEAU_CENTER.x - 480,
  y: TABLEAU_CENTER.y - 320,
  width: 960,
  height: 640
};

export const VOLITION_BOUNDS = {
  x: TABLEAU_CENTER.x - 430,
  y: TABLEAU_CENTER.y - 790,
  width: 1340,
  height: 360
};

export const SOURCE_BOUNDS = {
  x: TABLEAU_CENTER.x - 430,
  y: TABLEAU_CENTER.y + 420,
  width: 1340,
  height: 330
};

export const STANDARD_VIEW_BOOKMARKS = [
  { id: "drawing-zone", label: "Drawing", bounds: DRAWING_ZONE_BOUNDS },
  { id: "model-core", label: "Model Core", bounds: MODEL_CORE_BOUNDS, padding: 20 },
  { id: "volition", label: "Volition", bounds: VOLITION_BOUNDS },
  { id: "source", label: "Source", bounds: SOURCE_BOUNDS }
] as const;

export function computeResetViewTransform(
  viewportWidth: number,
  viewportHeight: number,
  targetBounds = TABLEAU_DEFAULT_VIEW_BOUNDS
) {
  return computeViewTransformForBounds(viewportWidth, viewportHeight, targetBounds, {
    fill: TABLEAU_DEFAULT_VIEW_FILL,
    minScale: 0.22,
    maxScale: 1.05
  });
}

export function computeViewTransformForBounds(
  viewportWidth: number,
  viewportHeight: number,
  targetBounds: TableauBounds,
  options: {
    fill?: number;
    padding?: number;
    minScale?: number;
    maxScale?: number;
  } = {}
) {
  const padding = options.padding ?? 0;
  const fill = options.fill ?? 0.82;
  const paddedBounds = expandBounds(targetBounds, padding);
  const scaleForWidth = (viewportWidth * fill) / paddedBounds.width;
  const scaleForHeight = (viewportHeight * fill) / paddedBounds.height;
  const scale = Math.min(
    options.maxScale ?? 2.5,
    Math.max(options.minScale ?? 0.16, Math.min(scaleForWidth, scaleForHeight))
  );
  const targetCenterX = paddedBounds.x + paddedBounds.width / 2;
  const targetCenterY = paddedBounds.y + paddedBounds.height / 2;

  return {
    scale,
    positionX: viewportWidth / 2 - targetCenterX * scale,
    positionY: viewportHeight / 2 - targetCenterY * scale
  };
}

export function computeObjectBounds({
  tableau,
  notes,
  arrows
}: {
  tableau: CardInstance[];
  notes: NoteObject[];
  arrows: ArrowObject[];
}): TableauBounds | null {
  const bounds: TableauBounds[] = [
    ...tableau.map(computeCardBounds),
    ...notes.map((note) => ({
      x: note.x,
      y: note.y,
      width: 190,
      height: 138
    })),
    ...arrows.map((arrow) => ({
      x: Math.min(arrow.x1, arrow.x2),
      y: Math.min(arrow.y1, arrow.y2),
      width: Math.abs(arrow.x2 - arrow.x1),
      height: Math.abs(arrow.y2 - arrow.y1)
    }))
  ];

  if (bounds.length === 0) return null;

  const left = Math.min(...bounds.map((bound) => bound.x));
  const top = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.width));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height));

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top)
  };
}

export function computeCardBounds(card: CardInstance): TableauBounds {
  const baseWidth = card.face === "both" || card.displayMode === "pdf-both" ? 252 : 126;
  const baseHeight = 176;
  const width = baseWidth * card.scale;
  const height = baseHeight * card.scale;

  return {
    x: card.x - Math.max(0, width - baseWidth) / 2,
    y: card.y - Math.max(0, height - baseHeight) / 2,
    width,
    height
  };
}

export function boundsInsideTableau(bounds: TableauBounds) {
  return (
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.x + bounds.width <= TABLEAU_WIDTH &&
    bounds.y + bounds.height <= TABLEAU_HEIGHT
  );
}

function expandBounds(bounds: TableauBounds, padding: number): TableauBounds {
  const x = Math.max(0, bounds.x - padding);
  const y = Math.max(0, bounds.y - padding);
  const right = Math.min(TABLEAU_WIDTH, bounds.x + bounds.width + padding);
  const bottom = Math.min(TABLEAU_HEIGHT, bounds.y + bounds.height + padding);

  return {
    x,
    y,
    width: Math.max(1, right - x),
    height: Math.max(1, bottom - y)
  };
}
