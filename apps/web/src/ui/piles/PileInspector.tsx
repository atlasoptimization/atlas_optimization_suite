import { useEffect, useMemo, useState } from "react";
import type { DeckCard } from "../../core/types/card";
import type { Pile } from "../../core/types/session";
import {
  getCardSubdomain,
  isDomainMasterCard,
  isOrdinaryCard,
  isSubdomainMasterCard
} from "../../engine/cards/cardClassification";
import { DrawPileCardList } from "./DrawPileCardList";

type CardTypeFilter = "all" | "domain-master" | "subdomain-master" | "ordinary";

type PileInspectorProps = {
  pile: Pile;
  cardsById: Map<string, DeckCard>;
  showScientificNames: boolean;
  onDrawCard: (domain: string, cardId: string, hidden?: boolean) => void;
  guidedSession?: {
    modeId: string;
    domain: string;
    stepId: string;
    cardsDrawn: string[];
  } | null;
  onDone?: () => void;
  onClose: () => void;
};

export function PileInspector({
  pile,
  cardsById,
  showScientificNames,
  onDrawCard,
  guidedSession,
  onDone,
  onClose
}: PileInspectorProps) {
  const [query, setQuery] = useState("");
  const [subdomain, setSubdomain] = useState("all");
  const [cardType, setCardType] = useState<CardTypeFilter>("all");
  const remainingCards = useMemo(
    () => pile.currentOrder.map((cardId) => cardsById.get(cardId)).filter(isDeckCard),
    [cardsById, pile.currentOrder]
  );
  const subdomains = useMemo(
    () => [
      ...new Set(
        remainingCards
          .map(getCardSubdomain)
          .filter((candidate): candidate is string => Boolean(candidate))
      )
    ].sort((a, b) => a.localeCompare(b)),
    [remainingCards]
  );
  const filteredCards = remainingCards.filter((card) => {
    const searchable = [
      card.cardname,
      card.twin,
      card.domain,
      card.subdomain,
      card.summary,
      card.keywords.join(" ")
    ]
      .join(" ")
      .toLowerCase();

    if (query.trim() && !searchable.includes(query.trim().toLowerCase())) return false;
    if (subdomain !== "all" && getCardSubdomain(card) !== subdomain) return false;
    if (cardType === "domain-master" && !isDomainMasterCard(card)) return false;
    if (cardType === "subdomain-master" && !isSubdomainMasterCard(card)) return false;
    if (cardType === "ordinary" && !isOrdinaryCard(card)) return false;
    return true;
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function previewCard(card: DeckCard) {
    window.alert([
      card.cardname,
      card.twin ? `Scientific twin: ${card.twin}` : "",
      card.subdomain ? `Subdomain: ${card.subdomain}` : "",
      card.summary
    ].filter(Boolean).join("\n\n"));
  }

  return (
    <div className="pile-inspector" data-testid="pile-inspector" role="dialog" aria-modal="false">
      <div className="pile-inspector-sticky-header">
        <div className="pile-inspector-header">
          <div>
            <h3>{pile.name} draw pile</h3>
            <p className="muted">
              Remaining {pile.currentOrder.length} · Drawn {pile.drawnCardIds.length} · Discard {pile.discardCardIds.length}
              {guidedSession ? ` · Guided step: ${guidedSession.cardsDrawn.length} drawn` : ""}
            </p>
          </div>
          <div className="pile-inspector-header-actions">
            {guidedSession && onDone && (
              <button type="button" onClick={onDone}>
                Done
              </button>
            )}
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        <div className="pile-inspector-filters">
          <label>
            Search
            <input value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <label>
            Subdomain
            <select value={subdomain} onChange={(event) => setSubdomain(event.target.value)}>
              <option value="all">All subdomains</option>
              {subdomains.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate}
                </option>
              ))}
            </select>
          </label>
          <label>
            Card type
            <select value={cardType} onChange={(event) => setCardType(event.target.value as CardTypeFilter)}>
              <option value="all">All</option>
              <option value="domain-master">Domain master</option>
              <option value="subdomain-master">Subdomain master</option>
              <option value="ordinary">Ordinary</option>
            </select>
          </label>
        </div>
      </div>

      <DrawPileCardList
        cards={filteredCards}
        showScientificNames={showScientificNames}
        onDrawCard={(cardId, hidden) => onDrawCard(pile.domain ?? pile.name, cardId, hidden)}
        onPreviewCard={previewCard}
      />
    </div>
  );
}

function isDeckCard(card: DeckCard | undefined): card is DeckCard {
  return Boolean(card);
}
