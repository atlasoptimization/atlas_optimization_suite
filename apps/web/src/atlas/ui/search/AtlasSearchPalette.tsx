type AtlasSearchPaletteProps = {
  onClose: () => void;
};

export function AtlasSearchPalette({ onClose }: AtlasSearchPaletteProps) {
  return (
    <div className="atlas-search-backdrop" role="dialog" aria-modal="true">
      <section className="atlas-search-palette">
        <header>
          <h2>Search Atlas model</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <input
          aria-label="Search Atlas model"
          placeholder="Cards, tags, properties, queries, objectives..."
          disabled
        />
        <p className="atlas-muted">
          Search will become active after Atlas cards and model indexes are added.
        </p>
      </section>
    </div>
  );
}
