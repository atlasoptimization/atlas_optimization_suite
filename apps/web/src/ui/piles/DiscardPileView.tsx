import { useEffect } from "react";
import type { DeckCard } from "../../core/types/card";
import type { Pile } from "../../core/types/session";

type DiscardPileViewProps = {
  pile: Pile;
  cardsById: Map<string, DeckCard>;
  onPlayCard: (domain: string, cardId: string) => void;
  onReturnCard: (domain: string, cardId: string) => void;
  onClose: () => void;
};

export function DiscardPileView({
  pile,
  cardsById,
  onPlayCard,
  onReturnCard,
  onClose
}: DiscardPileViewProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="discard-viewer" data-testid="discard-inspector" role="dialog" aria-modal="false">
      <div className="discard-viewer-sticky-header">
        <div className="discard-viewer-header">
          <div>
            <h3>{pile.name} discard</h3>
            <p className="muted">{pile.discardCardIds.length} discarded cards</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {pile.discardCardIds.length === 0 ? (
        <p className="muted">Discard pile is empty.</p>
      ) : (
        <div className="discard-card-list">
          {pile.discardCardIds.map((cardId) => {
            const card = cardsById.get(cardId);

            return (
              <div className="discard-card-row" key={cardId}>
                <span>{card?.cardname ?? cardId}</span>
                <button type="button" onClick={() => onPlayCard(pile.domain ?? pile.name, cardId)}>
                  Play
                </button>
                <button type="button" onClick={() => onReturnCard(pile.domain ?? pile.name, cardId)}>
                  Return
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
