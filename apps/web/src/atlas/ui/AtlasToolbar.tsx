export type AtlasToolbarAction =
  | "evaluate"
  | "solve"
  | "inspect"
  | "export"
  | "import"
  | "saveProject"
  | "loadProject"
  | "loadExample"
  | "undo"
  | "redo"
  | "search"
  | "clear";

type AtlasToolbarProps = {
  onAction: (action: AtlasToolbarAction) => void;
  canUndo: boolean;
  canRedo: boolean;
};

const primaryActions: Array<{ id: AtlasToolbarAction; label: string }> = [
  { id: "inspect", label: "Validate" },
  { id: "evaluate", label: "Evaluate" },
  { id: "solve", label: "Solve" },
  { id: "export", label: "Export" },
  { id: "saveProject", label: "Save" },
  { id: "loadProject", label: "Load" },
  { id: "search", label: "Search" }
];

const historyActions: Array<{ id: AtlasToolbarAction; label: string }> = [
  { id: "undo", label: "Undo" },
  { id: "redo", label: "Redo" }
];

export function AtlasToolbar({
  onAction,
  canUndo,
  canRedo
}: AtlasToolbarProps) {
  return (
    <header className="atlas-toolbar">
      <div className="atlas-brand-block">
        <strong>Atlas Optimization Suite</strong>
        <span>CVXPY-first optimization workbench</span>
      </div>

      <nav aria-label="Atlas primary actions" className="atlas-toolbar-actions">
        {primaryActions.map((action) => (
          <button key={action.id} type="button" onClick={() => onAction(action.id)}>
            {action.label}
          </button>
        ))}
      </nav>

      <nav aria-label="Atlas editing actions" className="atlas-toolbar-actions atlas-toolbar-secondary">
        {historyActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action.id)}
            disabled={(action.id === "undo" && !canUndo) || (action.id === "redo" && !canRedo)}
          >
            {action.label}
          </button>
        ))}
      </nav>

      <a className="atlas-deck-link" href="?app=deck">
        Open Data Science Deck
      </a>
    </header>
  );
}
