import { useEffect, useRef, type MouseEvent, type PointerEvent } from "react";
import type { ArrowObject } from "../../core/types/session";
import type { ContextMenuPosition } from "../context-menu/contextMenuTypes";

type ArrowObjectViewProps = {
  arrow: ArrowObject;
  selected: boolean;
  zoomScale: number;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onMoveEndpoint: (endpoint: "start" | "end", dx: number, dy: number) => void;
  onOpenContextMenu: (position: ContextMenuPosition) => void;
};

type DragState = {
  pointerId: number;
  kind: "arrow" | "endpoint";
  endpoint?: "start" | "end";
  lastX: number;
  lastY: number;
  target: SVGElement | null;
};

export function ArrowObjectView({
  arrow,
  selected,
  zoomScale,
  onSelect,
  onMove,
  onMoveEndpoint,
  onOpenContextMenu
}: ArrowObjectViewProps) {
  const dragRef = useRef<DragState | null>(null);

  function endDrag(pointerId?: number) {
    const drag = dragRef.current;
    if (!drag) return;
    if (pointerId !== undefined && drag.pointerId !== pointerId) return;

    if (drag.target?.hasPointerCapture(drag.pointerId)) {
      try {
        drag.target.releasePointerCapture(drag.pointerId);
      } catch {
        // Pointer capture may already be gone after cancel/lostcapture.
      }
    }

    dragRef.current = null;
  }

  useEffect(() => {
    function handleBlur() {
      endDrag();
    }

    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("blur", handleBlur);
      endDrag();
    };
  }, []);

  function beginArrowDrag(event: PointerEvent<SVGLineElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect();
    dragRef.current = {
      pointerId: event.pointerId,
      kind: "arrow",
      lastX: event.clientX,
      lastY: event.clientY,
      target: event.currentTarget
    };
  }

  function beginEndpointDrag(
    endpoint: "start" | "end",
    event: PointerEvent<SVGCircleElement>
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect();
    dragRef.current = {
      pointerId: event.pointerId,
      kind: "endpoint",
      endpoint,
      lastX: event.clientX,
      lastY: event.clientY,
      target: event.currentTarget
    };
  }

  function handleDragMove(event: PointerEvent<SVGLineElement | SVGCircleElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if ((event.buttons & 1) !== 1) {
      endDrag(event.pointerId);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const dx = (event.clientX - drag.lastX) / zoomScale;
    const dy = (event.clientY - drag.lastY) / zoomScale;
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
    if (drag.kind === "arrow") {
      onMove(dx, dy);
    } else if (drag.endpoint) {
      onMoveEndpoint(drag.endpoint, dx, dy);
    }
  }

  function handleDragEnd(event: PointerEvent<SVGLineElement | SVGCircleElement>) {
    event.stopPropagation();
    endDrag(event.pointerId);
  }

  function openContextMenu(event: PointerEvent<SVGLineElement> | MouseEvent<SVGLineElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect();
    onOpenContextMenu({ x: event.clientX, y: event.clientY });
  }

  return (
    <g className={`arrow-object ${selected ? "selected" : ""}`}>
      <line
        className="arrow-object-hit-line"
        x1={arrow.x1}
        y1={arrow.y1}
        x2={arrow.x2}
        y2={arrow.y2}
        strokeWidth={Math.max((arrow.strokeWidth ?? 4) + 16, 20)}
        onPointerDown={beginArrowDrag}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onLostPointerCapture={handleDragEnd}
        onContextMenu={openContextMenu}
      />
      <line
        className="arrow-object-line"
        x1={arrow.x1}
        y1={arrow.y1}
        x2={arrow.x2}
        y2={arrow.y2}
        strokeWidth={arrow.strokeWidth ?? 4}
        markerEnd="url(#arrowhead)"
      />
      {arrow.label && (
        <text
          className="arrow-object-label"
          x={(arrow.x1 + arrow.x2) / 2}
          y={(arrow.y1 + arrow.y2) / 2 - 10}
          textAnchor="middle"
        >
          {arrow.label}
        </text>
      )}
      {selected && (
        <>
          <circle
            className="arrow-endpoint"
            cx={arrow.x1}
            cy={arrow.y1}
            r={9}
            onPointerDown={(event) => beginEndpointDrag("start", event)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onLostPointerCapture={handleDragEnd}
          />
          <circle
            className="arrow-endpoint"
            cx={arrow.x2}
            cy={arrow.y2}
            r={9}
            onPointerDown={(event) => beginEndpointDrag("end", event)}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
            onLostPointerCapture={handleDragEnd}
          />
        </>
      )}
    </g>
  );
}
