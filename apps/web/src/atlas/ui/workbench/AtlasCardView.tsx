import type { PointerEvent } from "react";
import type { AtlasCard, AtlasCardType } from "../../core/types";

type AtlasCardViewProps = {
  card: AtlasCard;
  selected: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
};

const TYPE_LABELS: Record<AtlasCardType, string> = {
  object: "Object",
  decision: "Decision",
  data: "Data",
  function: "Function",
  constraint: "Constraint",
  objective: "Objective"
};

export function AtlasCardView({
  card,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel
}: AtlasCardViewProps) {
  return (
    <article
      className={`atlas-card atlas-card-${card.type} ${selected ? "selected" : ""}`}
      data-testid="atlas-card"
      data-card-id={card.id}
      style={{
        transform: `translate(${card.position.x}px, ${card.position.y}px)`
      }}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <header>
        <span>{TYPE_LABELS[card.type]}</span>
        <strong>{card.title}</strong>
      </header>
      <p>{card.notes || "No notes yet."}</p>
      <footer>
        <span>{card.tags.length} tags</span>
        <span>{card.properties.length} properties</span>
      </footer>
    </article>
  );
}
