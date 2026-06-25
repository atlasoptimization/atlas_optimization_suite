import { ATLAS_CARD_TYPES, type AtlasCardType } from "../core/types";

export type AtlasToolbarAction =
  | "evaluate"
  | "solve"
  | "inspect"
  | "export"
  | "undo"
  | "redo"
  | "search"
  | "clear";

type AtlasToolbarProps = {
  onAction: (action: AtlasToolbarAction) => void;
  onCreateCard: (cardType: AtlasCardType) => void;
  canUndo: boolean;
  canRedo: boolean;
};

const primaryActions: Array<{ id: AtlasToolbarAction; label: string }> = [
  { id: "evaluate", label: "Evaluate" },
  { id: "solve", label: "Solve" },
  { id: "inspect", label: "Inspect" },
  { id: "export", label: "Export" }
];

const historyActions: Array<{ id: AtlasToolbarAction; label: string }> = [
  { id: "undo", label: "Undo" },
  { id: "redo", label: "Redo" },
  { id: "search", label: "Search" }
];

const cardTypeLabels: Record<AtlasCardType, string> = {
  object: "Object",
  decision: "Decision",
  data: "Data",
  function: "Function",
  constraint: "Constraint",
  objective: "Objective"
};

export function AtlasToolbar({ onAction, onCreateCard, canUndo, canRedo }: AtlasToolbarProps) {
  return (
    <header className="atlas-toolbar">
      <div className="atlas-brand-block">
        <strong>Atlas Optimization Suite</strong>
        <span>Card-based optimization workbench</span>
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
        <button type="button" onClick={() => onAction("clear")}>
          Clear
        </button>
      </nav>

      <nav aria-label="Create Atlas card" className="atlas-toolbar-actions atlas-create-actions">
        {ATLAS_CARD_TYPES.map((cardType) => (
          <button key={cardType} type="button" onClick={() => onCreateCard(cardType)}>
            + {cardTypeLabels[cardType]}
          </button>
        ))}
      </nav>

      <a className="atlas-deck-link" href="?app=deck">
        Open Data Science Deck
      </a>
    </header>
  );
}
