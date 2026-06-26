import { ATLAS_CARD_TYPES, type AtlasCardType } from "../core/types";
import type { AtlasCardTemplate } from "../core/templates";

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
  onCreateCard: (cardType: AtlasCardType) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onCreateGroup: () => void;
  templates: AtlasCardTemplate[];
  canUndo: boolean;
  canRedo: boolean;
};

const primaryActions: Array<{ id: AtlasToolbarAction; label: string }> = [
  { id: "evaluate", label: "Evaluate" },
  { id: "solve", label: "Solve" },
  { id: "inspect", label: "Inspect" },
  { id: "export", label: "Export IR" },
  { id: "import", label: "Import IR" },
  { id: "saveProject", label: "Save Project" },
  { id: "loadProject", label: "Load Project" },
  { id: "loadExample", label: "Load Example" }
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

export function AtlasToolbar({
  onAction,
  onCreateCard,
  onCreateFromTemplate,
  onCreateGroup,
  templates,
  canUndo,
  canRedo
}: AtlasToolbarProps) {
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
        <label className="atlas-template-picker">
          <span>Template</span>
          <select
            defaultValue=""
            onChange={(event) => {
              const templateId = event.target.value;
              if (!templateId) return;
              onCreateFromTemplate(templateId);
              event.currentTarget.value = "";
            }}
            aria-label="Create card from template"
          >
            <option value="" disabled>
              Create from template...
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} - {template.description}
              </option>
            ))}
          </select>
        </label>
        {ATLAS_CARD_TYPES.map((cardType) => (
          <button key={cardType} type="button" onClick={() => onCreateCard(cardType)}>
            + {cardTypeLabels[cardType]}
          </button>
        ))}
        <button type="button" onClick={onCreateGroup}>
          + Group
        </button>
      </nav>

      <a className="atlas-deck-link" href="?app=deck">
        Open Data Science Deck
      </a>
    </header>
  );
}
