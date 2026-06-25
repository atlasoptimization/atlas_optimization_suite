import { useEffect, useRef, useState } from "react";
import type { PointerEvent, ReactNode } from "react";

export type FloatingPanelLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type FloatingPanelProps = {
  id: string;
  title: string;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
  minWidth: number;
  minHeight: number;
  layout?: FloatingPanelLayout;
  onLayoutChange?: (layout: FloatingPanelLayout) => void;
  onClose: () => void;
  children: ReactNode;
};

type DragState =
  | {
      kind: "move";
      pointerId: number;
      startX: number;
      startY: number;
      layout: FloatingPanelLayout;
    }
  | {
      kind: "resize";
      pointerId: number;
      startX: number;
      startY: number;
      layout: FloatingPanelLayout;
    };

export function FloatingPanel({
  id,
  title,
  initialX,
  initialY,
  initialWidth,
  initialHeight,
  minWidth,
  minHeight,
  layout,
  onLayoutChange,
  onClose,
  children
}: FloatingPanelProps) {
  const [internalLayout, setInternalLayout] = useState<FloatingPanelLayout>(
    layout ?? {
      x: initialX,
      y: initialY,
      width: initialWidth,
      height: initialHeight
    }
  );
  const activeLayout = layout ?? internalLayout;
  const dragRef = useRef<DragState | null>(null);
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (layout) setInternalLayout(layout);
  }, [layout]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function commitLayout(nextLayout: FloatingPanelLayout) {
    const clamped = clampLayout(nextLayout, minWidth, minHeight);
    setInternalLayout(clamped);
    onLayoutChange?.(clamped);
  }

  function startDrag(event: PointerEvent<HTMLElement>, kind: DragState["kind"]) {
    if (event.target instanceof Element && event.target.closest("[data-floating-panel-control]")) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      kind,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      layout: activeLayout
    };
  }

  function updateDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (drag.kind === "move") {
      commitLayout({
        ...drag.layout,
        x: drag.layout.x + dx,
        y: drag.layout.y + dy
      });
      return;
    }

    commitLayout({
      ...drag.layout,
      width: drag.layout.width + dx,
      height: drag.layout.height + dy
    });
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  return (
    <section
      className="floating-panel"
      data-floating-panel-id={id}
      data-testid={`${id}-panel`}
      style={{
        left: activeLayout.x,
        top: activeLayout.y,
        width: activeLayout.width,
        height: minimized ? undefined : activeLayout.height
      }}
    >
      <div
        className="floating-panel-titlebar"
        onPointerDown={(event) => startDrag(event, "move")}
        onPointerMove={updateDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <h2>{title}</h2>
        <div className="floating-panel-controls" data-floating-panel-control>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setMinimized((value) => !value)}
            aria-label={`${minimized ? "Restore" : "Minimize"} ${title}`}
          >
            {minimized ? "Restore" : "Minimize"}
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onClose}
            aria-label={`Close ${title}`}
          >
            Close
          </button>
        </div>
      </div>
      {!minimized && <div className="floating-panel-body">{children}</div>}
      {!minimized && (
        <div
          className="floating-panel-resize-handle"
          aria-hidden="true"
          onPointerDown={(event) => startDrag(event, "resize")}
          onPointerMove={updateDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        />
      )}
    </section>
  );
}

function clampLayout(
  layout: FloatingPanelLayout,
  minWidth: number,
  minHeight: number
): FloatingPanelLayout {
  const maxX = Math.max(8, window.innerWidth - 48);
  const maxY = Math.max(52, window.innerHeight - 48);

  return {
    x: Math.min(Math.max(8, layout.x), maxX),
    y: Math.min(Math.max(52, layout.y), maxY),
    width: Math.max(minWidth, layout.width),
    height: Math.max(minHeight, layout.height)
  };
}
