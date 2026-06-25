import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import { useEffect, useState } from "react";
import {
  ACTIVE_BOARD_BOUNDS,
  MODEL_CORE_BOUNDS,
  TABLEAU_HEIGHT,
  TABLEAU_WIDTH
} from "../../core/constants/tableau";
import type { CardInstance } from "../../core/types/session";
import { STAGING_LANE_BOUNDS } from "../../engine/placement/domainPlacement";
import { computeMinimapViewportRect } from "./minimapGeometry";

type MinimapProps = {
  cards: CardInstance[];
  controls: ReactZoomPanPinchContentRef;
};

const TOPOLOGY_BOUNDS = {
  x: ACTIVE_BOARD_BOUNDS.x + 760,
  y: ACTIVE_BOARD_BOUNDS.y + 80,
  width: 1460,
  height: 1540
};

export function Minimap({ cards, controls }: MinimapProps) {
  const [, forceRefresh] = useState(0);
  const wrapper = controls.instance.wrapperComponent;
  const { scale, positionX, positionY } = controls.instance.transformState;
  const viewport = wrapper
    ? computeMinimapViewportRect({
        scale,
        positionX,
        positionY,
        viewportWidth: wrapper.clientWidth,
        viewportHeight: wrapper.clientHeight,
        tableauWidth: TABLEAU_WIDTH,
        tableauHeight: TABLEAU_HEIGHT
      })
    : null;

  useEffect(() => {
    const refresh = window.setInterval(() => {
      forceRefresh((value) => (value + 1) % 100000);
    }, 150);

    return () => window.clearInterval(refresh);
  }, []);

  function centerAt(clientX: number, clientY: number, target: SVGSVGElement) {
    const wrapperElement = controls.instance.wrapperComponent;
    if (!wrapperElement) return;

    const rect = target.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * TABLEAU_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * TABLEAU_HEIGHT;

    controls.setTransform(
      wrapperElement.clientWidth / 2 - x * scale,
      wrapperElement.clientHeight / 2 - y * scale,
      scale,
      180,
      "easeOut"
    );
  }

  return (
    <div className="tableau-minimap" data-testid="minimap" aria-label="Tableau minimap">
      <svg
        viewBox={`0 0 ${TABLEAU_WIDTH} ${TABLEAU_HEIGHT}`}
        role="img"
        onClick={(event) => centerAt(event.clientX, event.clientY, event.currentTarget)}
      >
        <rect className="minimap-desk" x={0} y={0} width={TABLEAU_WIDTH} height={TABLEAU_HEIGHT} />
        <rect
          className="minimap-staging"
          x={STAGING_LANE_BOUNDS.x}
          y={STAGING_LANE_BOUNDS.y}
          width={STAGING_LANE_BOUNDS.width}
          height={STAGING_LANE_BOUNDS.height}
          rx={34}
        />
        <rect
          className="minimap-topology"
          x={TOPOLOGY_BOUNDS.x}
          y={TOPOLOGY_BOUNDS.y}
          width={TOPOLOGY_BOUNDS.width}
          height={TOPOLOGY_BOUNDS.height}
          rx={26}
        />
        <ellipse
          className="minimap-void"
          cx={MODEL_CORE_BOUNDS.x + MODEL_CORE_BOUNDS.width / 2}
          cy={MODEL_CORE_BOUNDS.y + MODEL_CORE_BOUNDS.height / 2}
          rx={MODEL_CORE_BOUNDS.width / 2}
          ry={MODEL_CORE_BOUNDS.height / 2}
        />
        {cards.map((card) => (
          <rect
            key={card.instanceId}
            className="minimap-card"
            x={card.x}
            y={card.y}
            width={card.face === "both" ? 220 : 126}
            height={176}
            rx={12}
          />
        ))}
        {viewport && (
          <rect
            className="minimap-viewport"
            x={viewport.x}
            y={viewport.y}
            width={viewport.width}
            height={viewport.height}
          />
        )}
      </svg>
      <span>Minimap</span>
    </div>
  );
}
