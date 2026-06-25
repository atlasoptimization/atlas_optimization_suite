export type MinimapViewportInput = {
  scale: number;
  positionX: number;
  positionY: number;
  viewportWidth: number;
  viewportHeight: number;
  tableauWidth: number;
  tableauHeight: number;
};

export type MinimapViewportRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function computeMinimapViewportRect({
  scale,
  positionX,
  positionY,
  viewportWidth,
  viewportHeight,
  tableauWidth,
  tableauHeight
}: MinimapViewportInput): MinimapViewportRect {
  const safeScale = Math.max(scale, 0.0001);
  const visibleLeft = -positionX / safeScale;
  const visibleTop = -positionY / safeScale;
  const visibleWidth = viewportWidth / safeScale;
  const visibleHeight = viewportHeight / safeScale;
  const x = clamp(visibleLeft, 0, tableauWidth);
  const y = clamp(visibleTop, 0, tableauHeight);
  const right = clamp(visibleLeft + visibleWidth, 0, tableauWidth);
  const bottom = clamp(visibleTop + visibleHeight, 0, tableauHeight);

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y)
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
