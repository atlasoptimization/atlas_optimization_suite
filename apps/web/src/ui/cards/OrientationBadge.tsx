import type { Orientation } from "../../core/types/session";

type OrientationBadgeProps = {
  orientation: Orientation;
};

const orientationSymbols: Record<Orientation, string> = {
  upright: "↑",
  reversed: "↓",
  modifier: "→",
  question: "?"
};

const orientationLabels: Record<Orientation, string> = {
  upright: "Upright",
  reversed: "Reversed",
  modifier: "Modifier",
  question: "Question"
};

export function OrientationBadge({ orientation }: OrientationBadgeProps) {
  return (
    <span
      className="orientation-badge"
      title={orientationLabels[orientation]}
      aria-label={orientationLabels[orientation]}
    >
      {orientationSymbols[orientation]}
    </span>
  );
}
