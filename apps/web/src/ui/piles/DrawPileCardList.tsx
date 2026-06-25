import type { DeckCard } from "../../core/types/card";
import { CardView } from "../cards/CardView";

type DrawPileCardListProps = {
  cards: DeckCard[];
  showScientificNames: boolean;
  onDrawCard: (cardId: string, hidden?: boolean) => void;
  onPreviewCard: (card: DeckCard) => void;
};

export function DrawPileCardList({
  cards,
  showScientificNames,
  onDrawCard,
  onPreviewCard
}: DrawPileCardListProps) {
  if (cards.length === 0) {
    return <p className="muted">No cards match these filters.</p>;
  }

  return (
    <div className="pile-card-list">
      {cards.map((card) => (
        <div className="pile-card-row" key={card.id}>
          <div className="pile-card-name">
            <strong>{showScientificNames ? card.twin || card.cardname : card.cardname}</strong>
            <span>{card.subdomain || "No subdomain"}</span>
            {showScientificNames && card.twin && <small>{card.cardname}</small>}
          </div>
          <button type="button" onClick={() => onPreviewCard(card)}>
            Preview
            <span className="pile-card-hover-preview" aria-hidden="true">
              <span>
                <CardView
                  card={card}
                  displayMode="card-face"
                  orientation="upright"
                  face="front"
                  previewVariant="thumb"
                />
              </span>
              <span>
                <CardView
                  card={card}
                  displayMode="card-face"
                  orientation="upright"
                  face="back"
                  previewVariant="thumb"
                />
              </span>
            </span>
          </button>
          <button type="button" onClick={() => onDrawCard(card.id)}>
            Draw
          </button>
          <button type="button" onClick={() => onDrawCard(card.id, true)}>
            Draw secret
          </button>
        </div>
      ))}
    </div>
  );
}
