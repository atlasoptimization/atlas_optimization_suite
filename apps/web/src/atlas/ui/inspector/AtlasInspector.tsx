import type { AtlasCard } from "../../core/types";

type AtlasInspectorProps = {
  card: AtlasCard | null;
  onDeleteCard: (cardId: string) => void;
  onClear: () => void;
};

export function AtlasInspector({ card, onDeleteCard, onClear }: AtlasInspectorProps) {
  if (!card) {
    return (
      <section className="atlas-panel atlas-inspector-panel" aria-label="Atlas inspector">
        <header>
          <p className="atlas-eyebrow">Inspector</p>
          <h2>No selection</h2>
        </header>
        <p className="atlas-muted">
          Select a card to inspect its type, position, tags, properties, and notes.
        </p>
        <button type="button" className="atlas-danger-button" onClick={onClear}>
          Clear workbench
        </button>
      </section>
    );
  }

  return (
    <section className="atlas-panel atlas-inspector-panel" aria-label="Atlas inspector">
      <header>
        <p className="atlas-eyebrow">Inspector</p>
        <h2>{card.title}</h2>
      </header>
      <dl className="atlas-placeholder-list">
        <div>
          <dt>Type</dt>
          <dd>{card.type}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>
            x {card.position.x}, y {card.position.y}
          </dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{card.tags.length === 0 ? "No tags yet." : `${card.tags.length} tags`}</dd>
        </div>
        <div>
          <dt>Properties</dt>
          <dd>
            {card.properties.length === 0
              ? "No properties yet."
              : `${card.properties.length} properties`}
          </dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{card.notes || "No notes yet."}</dd>
        </div>
      </dl>
      <button type="button" className="atlas-danger-button" onClick={() => onDeleteCard(card.id)}>
        Delete card
      </button>
    </section>
  );
}
