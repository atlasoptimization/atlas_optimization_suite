import type { PointerEvent } from "react";
import type { ModeRecommendation } from "../../core/types/mode";

type NextActionPanelProps = {
  modeName: string;
  recommendation: ModeRecommendation | null;
  disabled?: boolean;
  disabledReason?: string;
  isDragging?: boolean;
  onDragStart?: (event: PointerEvent<HTMLElement>) => void;
  onDragMove?: (event: PointerEvent<HTMLElement>) => void;
  onDragEnd?: (event: PointerEvent<HTMLElement>) => void;
  onResetPosition?: () => void;
  onNext: () => void;
};

export function NextActionPanel({
  modeName,
  recommendation,
  disabled = false,
  disabledReason,
  isDragging = false,
  onDragStart,
  onDragMove,
  onDragEnd,
  onResetPosition,
  onNext
}: NextActionPanelProps) {
  const mechanical = disabled
    ? disabledReason ?? "No valid action available"
    : recommendation?.mechanical ?? recommendation?.label ?? "Use the normal domain cycle";
  const interpretation = disabled
    ? "Resolve the unavailable step or use manual actions."
    : recommendation?.interpretation ?? recommendation?.description ?? "Advance the current mode.";

  return (
    <section
      className={`next-action-panel ${isDragging ? "dragging" : ""}`}
      aria-label="Current mode action"
      data-testid="next-action-panel"
    >
      <header
        className="next-action-drag-handle"
        data-testid="next-panel-drag-handle"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        onLostPointerCapture={onDragEnd}
        onDoubleClick={onResetPosition}
        title="Drag to move. Double-click to reset position."
      >
        <div className="next-action-mode">Mode: <strong>{modeName}</strong></div>
        {onResetPosition && (
          <button
            type="button"
            className="next-action-reset-position"
            data-testid="next-panel-reset-position"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={onResetPosition}
            title="Reset Next panel position"
          >
            Reset
          </button>
        )}
      </header>
      <button
        type="button"
        data-testid="topbar-draw-next"
        className="next-action-button"
        onClick={onNext}
        disabled={disabled}
        title={disabledReason}
      >
        Next
      </button>
      <div className="next-action-copy">
        <span><strong>Mechanical:</strong> {mechanical}</span>
        <span><strong>Interpretation:</strong> {interpretation}</span>
      </div>
    </section>
  );
}
