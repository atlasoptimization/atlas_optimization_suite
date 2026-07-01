import type { AtlasContextMenuItem, AtlasContextMenuState } from "./AtlasContextMenu";

export type AtlasContextMenuTarget = AtlasContextMenuState["kind"];

export type AtlasContextMenuDescriptor = {
  target: AtlasContextMenuTarget;
  items: AtlasContextMenuItem[];
};

export const ATLAS_CONTEXT_MENU_REGISTRY: AtlasContextMenuDescriptor[] = [
  {
    target: "canvas",
    items: [
      { id: "create-variable", label: "Create Variable" },
      { id: "create-parameter", label: "Create Parameter" },
      { id: "create-constant", label: "Create Constant" },
      { id: "create-atom", label: "Create Atom" },
      { id: "create-constraint", label: "Create Constraint" },
      { id: "create-objective", label: "Create Objective" },
      { id: "paste", label: "Paste", disabled: true },
      { id: "reset-view", label: "Reset view / center view", disabled: true }
    ]
  },
  {
    target: "node",
    items: [
      { id: "rename", label: "Rename" },
      { id: "duplicate-reference", label: "Duplicate visual reference" },
      { id: "delete-reference", label: "Delete visual reference", destructive: true },
      { id: "delete-canonical", label: "Delete canonical object", destructive: true },
      { id: "open-inspector", label: "Open in Inspector" },
      { id: "show-dependencies", label: "Show dependencies" },
      { id: "show-references", label: "Show all references to same canonical object" },
      { id: "copy-reference", label: "Create reference / copy reference" },
      { id: "validate-object", label: "Validate selected object" },
      { id: "evaluate-object", label: "Evaluate selected object" },
      { id: "generate-selected-code", label: "Generate code for selected object", disabled: true },
      { id: "fit-dependencies", label: "Fit view to dependencies", disabled: true }
    ]
  },
  {
    target: "connection",
    items: [
      { id: "delete-connection", label: "Delete connection", destructive: true },
      { id: "inspect-connection", label: "Inspect connection" },
      { id: "highlight-connection", label: "Highlight source and target" }
    ]
  },
  {
    target: "explorer",
    items: [
      { id: "place-reference", label: "Place reference on workspace" },
      { id: "rename-canonical", label: "Rename canonical object" },
      { id: "edit-definition", label: "Edit definition" },
      { id: "show-value", label: "Show value" },
      { id: "show-code", label: "Show CVXPY Code" },
      { id: "delete-canonical", label: "Delete canonical object", destructive: true },
      { id: "show-references", label: "Show all workspace references" },
      { id: "validate-object", label: "Validate" },
      { id: "evaluate-object", label: "Evaluate if applicable" }
    ]
  }
];

export function contextMenuItemsForTarget(target: AtlasContextMenuTarget): AtlasContextMenuItem[] {
  return ATLAS_CONTEXT_MENU_REGISTRY.find((menu) => menu.target === target)?.items ?? [];
}
