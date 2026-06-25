import type { PointerEvent } from "react";
import { taggedSumPreview } from "../../core/functions";
import type { AtlasCard, AtlasCardQuery, AtlasCardType } from "../../core/types";

type AtlasCardViewProps = {
  card: AtlasCard;
  allCards: AtlasCard[];
  queries: AtlasCardQuery[];
  dependencyPropertyNames: Set<string>;
  selected: boolean;
  highlighted: boolean;
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
  allCards,
  queries,
  dependencyPropertyNames,
  selected,
  highlighted,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel
}: AtlasCardViewProps) {
  const functionPreview =
    card.type === "function" && card.functionKind === "tagged_sum"
      ? taggedSumPreview(card, queries, allCards)
      : null;

  return (
    <article
      className={`atlas-card atlas-card-${card.type} ${selected ? "selected" : ""} ${
        highlighted ? "query-highlighted" : ""
      }`}
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
      {card.tags.length > 0 && (
        <div className="atlas-card-tags" aria-label={`${card.title} tags`}>
          {card.tags.slice(0, 4).map((tag) => (
            <span key={tag.id} className="atlas-tag-chip">
              {tag.key}={tag.value || "value"}
            </span>
          ))}
          {card.tags.length > 4 && <span className="atlas-tag-chip">+{card.tags.length - 4}</span>}
        </div>
      )}
      {card.properties.length > 0 && (
        <div className="atlas-card-properties" aria-label={`${card.title} properties`}>
          {card.properties.slice(0, 3).map((property) => (
            <span
              key={property.id}
              className={dependencyPropertyNames.has(property.name) ? "dependency-property" : ""}
            >
              <strong>{property.name}</strong>
              <em>{formatPropertyValue(property.value)}</em>
            </span>
          ))}
          {card.properties.length > 3 && <span>+{card.properties.length - 3} more</span>}
        </div>
      )}
      {functionPreview && (
        <div className="atlas-function-preview" aria-label={`${card.title} TaggedSum preview`}>
          <span>
            <strong>Query</strong>
            <em>{functionPreview.queryName}</em>
          </span>
          <span>
            <strong>Expression</strong>
            <em>{functionPreview.expressionLabel}</em>
          </span>
          <span>
            <strong>Matches</strong>
            <em>{functionPreview.matchCount}</em>
          </span>
        </div>
      )}
      <p>{card.notes || "No notes yet."}</p>
      <footer>
        <span>{card.tags.length} tags</span>
        <span>{card.properties.length} properties</span>
      </footer>
    </article>
  );
}

function formatPropertyValue(value: AtlasCard["properties"][number]["value"]) {
  if (value === null || value === "") return "empty";
  return String(value);
}
