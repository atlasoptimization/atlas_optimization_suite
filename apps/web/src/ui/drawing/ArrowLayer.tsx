import type { ArrowObject } from "../../core/types/session";
import type { ContextMenuPosition } from "../context-menu/contextMenuTypes";
import { ArrowObjectView } from "./ArrowObjectView";

type ArrowLayerProps = {
  arrows: ArrowObject[];
  selectedArrowId: string | null;
  width: number;
  height: number;
  zoomScale: number;
  onSelectArrow: (arrowId: string) => void;
  onMoveArrow: (arrowId: string, dx: number, dy: number) => void;
  onMoveEndpoint: (arrowId: string, endpoint: "start" | "end", dx: number, dy: number) => void;
  onOpenContextMenu: (arrow: ArrowObject, position: ContextMenuPosition) => void;
};

export function ArrowLayer({
  arrows,
  selectedArrowId,
  width,
  height,
  zoomScale,
  onSelectArrow,
  onMoveArrow,
  onMoveEndpoint,
  onOpenContextMenu
}: ArrowLayerProps) {
  return (
    <svg className="arrow-layer" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" />
        </marker>
      </defs>
      {arrows.map((arrow) => (
        <ArrowObjectView
          key={arrow.id}
          arrow={arrow}
          selected={selectedArrowId === arrow.id}
          zoomScale={zoomScale}
          onSelect={() => onSelectArrow(arrow.id)}
          onMove={(dx, dy) => onMoveArrow(arrow.id, dx, dy)}
          onMoveEndpoint={(endpoint, dx, dy) => onMoveEndpoint(arrow.id, endpoint, dx, dy)}
          onOpenContextMenu={(position) => onOpenContextMenu(arrow, position)}
        />
      ))}
    </svg>
  );
}
