import type { ArrowObject } from "../../core/types/session";

type ArrowInspectorProps = {
  arrow: ArrowObject;
  onLabelChange: (label: string) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
  onDelete: () => void;
};

export function ArrowInspector({
  arrow,
  onLabelChange,
  onStrokeWidthChange,
  onDelete
}: ArrowInspectorProps) {
  return (
    <div className="arrow-inspector">
      <h3>Arrow</h3>
      <label>
        Label
        <input
          value={arrow.label ?? ""}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder="Optional label"
        />
      </label>
      <label>
        Stroke width
        <input
          type="number"
          min={1}
          max={16}
          value={arrow.strokeWidth ?? 4}
          onChange={(event) => onStrokeWidthChange(Number(event.target.value))}
        />
      </label>
      <button type="button" onClick={onDelete}>
        Delete arrow
      </button>
    </div>
  );
}
