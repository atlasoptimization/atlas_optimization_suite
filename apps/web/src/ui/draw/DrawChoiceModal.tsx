import { useEffect, useState, type CSSProperties } from "react";
import type { DeckCard } from "../../core/types/card";
import type { CardFace } from "../../core/types/view";
import type { PendingDrawChoice } from "../../core/types/session";
import { CardView } from "../cards/CardView";

type DrawChoiceModalProps = {
  choice: PendingDrawChoice;
  cardsById: Map<string, DeckCard>;
  previewScale: number;
  onPreviewScaleChange: (scale: number) => void;
  onChoose: (cardId: string) => void;
  onCancel: () => void;
};

export function DrawChoiceModal({
  choice,
  cardsById,
  previewScale,
  onPreviewScaleChange,
  onChoose,
  onCancel
}: DrawChoiceModalProps) {
  const [previewFace, setPreviewFace] = useState<CardFace>("front");
  const candidateCount = Math.max(1, Math.min(choice.cardIds.length, 12));
  const previewWidth = Math.round(220 * previewScale);
  const desiredModalWidth = candidateCount * previewWidth + Math.max(0, candidateCount - 1) * 18 + 32;
  const previewVariant = previewScale >= 1.25 ? "reading" : "thumb";
  const modalStyle = {
    "--choice-preview-scale": previewScale,
    "--choice-card-width": `${previewWidth}px`,
    "--choice-modal-width": `${desiredModalWidth}px`
  } as CSSProperties;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="draw-choice-backdrop">
      <section
        className="draw-choice-modal"
        data-testid="draw-choice-modal"
        role="dialog"
        aria-modal="true"
        style={modalStyle}
      >
        <div className="draw-choice-header">
          <div className="draw-choice-header-actions">
            <div className="overlay-scale-controls" aria-label="Choice preview size">
              <button
                type="button"
                data-testid="choice-scale-decrease"
                onClick={() => onPreviewScaleChange(previewScale - 0.1)}
              >
                -
              </button>
              <strong>{Math.round(previewScale * 100)}%</strong>
              <button
                type="button"
                data-testid="choice-scale-increase"
                onClick={() => onPreviewScaleChange(previewScale + 0.1)}
              >
                +
              </button>
            </div>
            <button type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
          <h2>Choose 1 from {choice.cardIds.length}: {choice.domain}</h2>
        </div>
        <p className="muted">
          Click a card to choose it. Cancel returns all candidates to the draw pile in their current order.
        </p>
        <div className="draw-choice-grid">
          {choice.cardIds.map((cardId) => {
            const card = cardsById.get(cardId);
            if (!card) return null;

            return (
              <div className="draw-choice-card" key={cardId}>
                <button
                  type="button"
                  className="draw-choice-card-preview-button"
                  onClick={() => onChoose(cardId)}
                  aria-label={`Choose ${card.cardname}`}
                >
                  <CardView
                    card={card}
                    displayMode="card-face"
                    orientation="upright"
                    face={previewFace}
                    previewVariant={previewVariant}
                  />
                </button>
                <button
                  type="button"
                  className="draw-choice-flip"
                  onClick={() =>
                    setPreviewFace((current) => (current === "front" ? "back" : "front"))
                  }
                >
                  Flip to {previewFace === "front" ? "back" : "front"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
