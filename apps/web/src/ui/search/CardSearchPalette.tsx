import { useEffect, useMemo, useRef, useState } from "react";
import type { DeckCard } from "../../core/types/card";

type CardSearchPaletteProps = {
  cards: DeckCard[];
  onPlaceCard: (card: DeckCard) => void;
  onClose: () => void;
};

type SearchResult = {
  card: DeckCard;
  score: number;
  matched: string;
};

const MAX_RESULTS = 30;

export function CardSearchPalette({ cards, onPlaceCard, onClose }: CardSearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const results = useMemo(() => searchCards(cards, query), [cards, query]);
  const selected = results[selectedIndex]?.card;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function placeSelected() {
    if (!selected) return;
    onPlaceCard(selected);
    onClose();
  }

  return (
    <div className="command-palette-backdrop" role="dialog" aria-modal="true">
      <section
        className="card-search-palette"
        data-testid="card-search-palette"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((current) => Math.min(results.length - 1, current + 1));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((current) => Math.max(0, current - 1));
          } else if (event.key === "Enter") {
            event.preventDefault();
            placeSelected();
          }
        }}
      >
        <header>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards by name, twin, domain, keyword, or text..."
            aria-label="Search cards"
          />
          <button type="button" onClick={onClose} aria-label="Close search">
            Close
          </button>
        </header>

        <div className="card-search-results">
          {results.length === 0 ? (
            <p className="muted">No matching cards.</p>
          ) : (
            results.map((result, index) => (
              <button
                key={result.card.id}
                type="button"
                className={index === selectedIndex ? "active" : ""}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => {
                  onPlaceCard(result.card);
                  onClose();
                }}
              >
                <span className="card-search-main">
                  <strong>{result.card.cardname}</strong>
                  {result.card.twin && <em>{result.card.twin}</em>}
                </span>
                <span className="card-search-meta">
                  {result.card.domain}
                  {result.card.subdomain ? ` / ${result.card.subdomain}` : ""}
                </span>
                {result.matched && <small>{result.matched}</small>}
              </button>
            ))
          )}
        </div>

        <footer>
          <span>↑↓ select</span>
          <span>Enter place</span>
          <span>Esc close</span>
        </footer>
      </section>
    </div>
  );
}

export function searchCards(cards: DeckCard[], query: string): SearchResult[] {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return cards.slice(0, MAX_RESULTS).map((card) => ({
      card,
      score: 1,
      matched: card.twin || card.summary || ""
    }));
  }

  return cards
    .map((card) => scoreCard(card, normalizedQuery))
    .filter((result): result is SearchResult => result !== null)
    .sort((left, right) => right.score - left.score || left.card.cardname.localeCompare(right.card.cardname))
    .slice(0, MAX_RESULTS);
}

function scoreCard(card: DeckCard, query: string): SearchResult | null {
  const fields: Array<{ value: string; score: number; label: string }> = [
    { value: card.cardname, score: 100, label: card.cardname },
    { value: card.twin, score: 82, label: card.twin },
    { value: card.domain, score: 64, label: card.domain },
    { value: card.subdomain, score: 58, label: card.subdomain },
    { value: card.keywords.join(" "), score: 52, label: card.keywords.join(", ") },
    { value: card.question, score: 34, label: card.question },
    { value: card.summary, score: 28, label: card.summary },
    { value: card.story, score: 18, label: card.story }
  ];

  let best: SearchResult | null = null;

  for (const field of fields) {
    const normalizedValue = normalize(field.value);
    if (!normalizedValue.includes(query)) continue;

    const startsWithBonus = normalizedValue.startsWith(query) ? 20 : 0;
    const exactBonus = normalizedValue === query ? 30 : 0;
    const score = field.score + startsWithBonus + exactBonus;

    if (!best || score > best.score) {
      best = {
        card,
        score,
        matched: field.label
      };
    }
  }

  return best;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}
