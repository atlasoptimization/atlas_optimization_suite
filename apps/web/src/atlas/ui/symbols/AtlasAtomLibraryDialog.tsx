import { useMemo, useState } from "react";
import type { AtlasAtomSpec } from "../../core/atoms";
import {
  getAllSymbols,
  searchSymbols,
  symbolCatalogMetadata,
  type AtlasSymbolSpec
} from "../../core/symbolCatalog";
import { symbolToAtomSpec } from "../../core/generatedSymbols";

type AtlasAtomLibraryDialogProps = {
  onClose: () => void;
  onCreateSymbol: (atomSpec: AtlasAtomSpec) => void;
};

export function AtlasAtomLibraryDialog({ onClose, onCreateSymbol }: AtlasAtomLibraryDialogProps) {
  const [query, setQuery] = useState("");
  const metadata = symbolCatalogMetadata();
  const symbols = useMemo(
    () => (query.trim() ? searchSymbols(query) : getAllSymbols()),
    [query]
  );
  const grouped = useMemo(() => groupSymbolsByCategory(symbols), [symbols]);

  return (
    <div className="atlas-dialog-backdrop" role="presentation">
      <section className="atlas-dialog atlas-atom-library-dialog" role="dialog" aria-label="CVXPY Atom Library">
        <header>
          <p className="atlas-eyebrow">Symbol Catalog</p>
          <h2>CVXPY Atom Library</h2>
          <p className="atlas-muted">
            {metadata.symbolCount} synchronized symbols from CVXPY {metadata.cvxpyVersion ?? "unknown"}.
          </p>
        </header>
        <label className="atlas-constructor-field">
          <span>Search symbols</span>
          <input
            value={query}
            placeholder="norm, hstack, matmul, <=..."
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
        </label>
        <div className="atlas-atom-library-list">
          {grouped.map(([category, categorySymbols]) => (
            <section key={category} className="atlas-atom-library-group">
              <h3>{category}</h3>
              {categorySymbols.map((symbol) => (
                <article key={symbol.id} className="atlas-atom-library-item">
                  <header>
                    <div>
                      <strong>{symbol.name}</strong>
                      <span>{symbol.kind}</span>
                    </div>
                    <button type="button" onClick={() => onCreateSymbol(symbolToAtomSpec(symbol))}>
                      Define
                    </button>
                  </header>
                  <code>{symbol.signature ?? "(*args)"}</code>
                  {symbol.doc && <p>{symbol.doc}</p>}
                  {symbol.examples && symbol.examples.length > 0 && (
                    <p className="atlas-muted">Examples: {symbol.examples.join("; ")}</p>
                  )}
                  {symbol.ui && <p className="atlas-muted">UI hints: {Object.keys(symbol.ui).join(", ")}</p>}
                  {symbol.warning && <p className="atlas-form-error">{symbol.warning}</p>}
                </article>
              ))}
            </section>
          ))}
        </div>
        <div className="atlas-inspector-main-actions">
          <button type="button" onClick={onClose}>Close</button>
        </div>
      </section>
    </div>
  );
}

function groupSymbolsByCategory(symbols: AtlasSymbolSpec[]) {
  const grouped = symbols.reduce<Record<string, AtlasSymbolSpec[]>>((current, symbol) => {
    const category = symbol.category || symbol.module || symbol.kind || "Symbols";
    current[category] = [...(current[category] ?? []), symbol];
    return current;
  }, {});
  return Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right));
}
