import type { CustomCard } from "../../core/types/card";

type CustomCardListProps = {
  cards: CustomCard[];
  onPlace: (card: CustomCard) => void;
  onEdit: (card: CustomCard) => void;
  onDelete: (cardId: string) => void;
};

export function CustomCardList({ cards, onPlace, onEdit, onDelete }: CustomCardListProps) {
  if (cards.length === 0) {
    return <p className="muted custom-card-empty">No custom cards yet.</p>;
  }

  return (
    <div className="custom-card-list">
      {cards.map((card) => (
        <div key={card.id} className="custom-card-row">
          <span>{card.cardname}</span>
          <button type="button" onClick={() => onPlace(card)}>
            Place
          </button>
          <button type="button" onClick={() => onEdit(card)}>
            Edit
          </button>
          <button type="button" onClick={() => onDelete(card.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
