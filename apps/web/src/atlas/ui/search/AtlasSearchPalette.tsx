import { useMemo, useState } from "react";
import {
  createAtlasCommands,
  filterAtlasCommands,
  searchAtlasCards,
  type AtlasCommandId
} from "../../core/search";
import type { AtlasCard } from "../../core/types";
import type { AtlasCardTemplate } from "../../core/templates";

type AtlasSearchPaletteProps = {
  cards: AtlasCard[];
  templates: AtlasCardTemplate[];
  onClose: () => void;
  onSelectCard: (cardId: string) => void;
  onRunCommand: (commandId: AtlasCommandId) => void;
};

export function AtlasSearchPalette({
  cards,
  templates,
  onClose,
  onSelectCard,
  onRunCommand
}: AtlasSearchPaletteProps) {
  const [query, setQuery] = useState("");
  const commands = useMemo(() => createAtlasCommands(templates), [templates]);
  const filteredCommands = useMemo(
    () => filterAtlasCommands(commands, query).slice(0, 10),
    [commands, query]
  );
  const cardResults = useMemo(() => searchAtlasCards(cards, query).slice(0, 12), [cards, query]);

  return (
    <div
      className="atlas-search-backdrop"
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <section className="atlas-search-palette">
        <header>
          <div>
            <h2>Command palette</h2>
            <p className="atlas-muted">Create cards, run model actions, or search cards.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <input
          autoFocus
          aria-label="Search Atlas model and commands"
          placeholder="Search cards, tags, properties, or commands..."
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />

        <section className="atlas-command-section">
          <h3>Commands</h3>
          <ul className="atlas-command-list">
            {filteredCommands.map((command) => (
              <li key={command.id}>
                <button
                  type="button"
                  onClick={() => {
                    onRunCommand(command.id);
                    onClose();
                  }}
                >
                  {command.label}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="atlas-command-section">
          <h3>Cards</h3>
          {cardResults.length === 0 ? (
            <p className="atlas-muted">
              {query.trim() ? "No matching cards." : "Type to search by title, type, tags, or properties."}
            </p>
          ) : (
            <ul className="atlas-command-list">
              {cardResults.map((result) => (
                <li key={result.card.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCard(result.card.id);
                      onClose();
                    }}
                  >
                    <span>{result.card.title}</span>
                    <em>
                      {result.card.type} · {result.matches.slice(0, 3).join(", ")}
                    </em>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>
    </div>
  );
}
