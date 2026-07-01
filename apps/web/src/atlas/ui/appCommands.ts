import type { AtlasWorkbenchView } from "./views/AtlasMultiView";

export type AtlasCommandId =
  | "evaluate"
  | "evaluateSolution"
  | "solve"
  | "inspect"
  | "generateCode"
  | "exportColab"
  | "newModel"
  | "clearDesk"
  | "export"
  | "import"
  | "saveProject"
  | "loadProject"
  | "loadExample"
  | "loadTinyLp"
  | "loadLeastSquares"
  | "loadRidge"
  | "undo"
  | "redo"
  | "deleteSelected"
  | "duplicateSelected"
  | "renameSelected"
  | "clearSelection"
  | "backendHealth"
  | "search"
  | "clear"
  | "tutorial"
  | "examples"
  | "atomLibrary"
  | "settings"
  | "resetUILayout"
  | "gettingStarted"
  | "keyboardShortcuts"
  | "about"
  | `view:${AtlasWorkbenchView}`;

export type AtlasCommandContext = {
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
};

export type AtlasCommandDescriptor = {
  id: AtlasCommandId;
  label: string;
  shortcut?: string;
  menu?: string;
  disabledReason?: string;
  enabled?: (context: AtlasCommandContext) => boolean;
};

export type AtlasCommandExecutor = (commandId: AtlasCommandId) => void | Promise<void>;

export const ATLAS_COMMANDS: AtlasCommandDescriptor[] = [
  { id: "newModel", label: "New Model", shortcut: "Ctrl/Cmd+N", menu: "File" },
  { id: "clearDesk", label: "Clear Desk", menu: "File" },
  { id: "loadProject", label: "Open / Load Project", shortcut: "Ctrl/Cmd+O", menu: "File" },
  { id: "saveProject", label: "Save Project", shortcut: "Ctrl/Cmd+S", menu: "File" },
  { id: "saveProject", label: "Save Project As", menu: "File" },
  { id: "import", label: "Import Atlas IR", menu: "File" },
  { id: "export", label: "Export Atlas IR", menu: "File" },
  { id: "generateCode", label: "Export CVXPY code", menu: "File" },
  { id: "exportColab", label: "Export to Colab notebook", menu: "File" },
  { id: "examples", label: "Load Example", menu: "File" },
  { id: "undo", label: "Undo", shortcut: "Ctrl/Cmd+Z", menu: "Edit", enabled: (context) => context.canUndo },
  { id: "redo", label: "Redo", shortcut: "Ctrl/Cmd+Shift+Z", menu: "Edit", enabled: (context) => context.canRedo },
  { id: "deleteSelected", label: "Delete Selected", shortcut: "Delete", menu: "Edit", enabled: (context) => context.hasSelection },
  { id: "duplicateSelected", label: "Duplicate Selected Reference", menu: "Edit", enabled: (context) => context.hasSelection },
  { id: "renameSelected", label: "Rename Selected", menu: "Edit", enabled: (context) => context.hasSelection },
  { id: "clearSelection", label: "Clear Selection", menu: "Edit", enabled: (context) => context.hasSelection },
  { id: "view:object", label: "Object View", menu: "View" },
  { id: "view:ir", label: "Atlas IR View", menu: "View" },
  { id: "view:code", label: "CVXPY Code View", menu: "View" },
  { id: "view:solution", label: "Solution View", menu: "View" },
  { id: "view:diagnostics", label: "Diagnostics View", menu: "View" },
  { id: "inspect", label: "Validate", menu: "Run" },
  { id: "evaluate", label: "Evaluate Current", menu: "Run" },
  { id: "generateCode", label: "Generate Code", menu: "Run" },
  { id: "solve", label: "Solve", menu: "Run" },
  { id: "evaluateSolution", label: "Evaluate at solution", menu: "Run" },
  { id: "backendHealth", label: "Backend Health Check", menu: "Run" },
  { id: "loadTinyLp", label: "Tiny LP", menu: "Examples" },
  { id: "loadLeastSquares", label: "Least Squares", menu: "Examples" },
  { id: "loadRidge", label: "Ridge Regression", menu: "Examples" },
  { id: "tutorial", label: "Tutorial Mode / Guided Examples", menu: "Examples" },
  { id: "search", label: "Command Palette", shortcut: "Ctrl/Cmd+K", menu: "Tools" },
  { id: "atomLibrary", label: "Atom Library", menu: "Tools" },
  { id: "backendHealth", label: "CVXPY Atom Registry", menu: "Tools" },
  { id: "settings", label: "Settings", menu: "Tools", disabledReason: "Settings are not implemented yet." },
  { id: "resetUILayout", label: "Reset UI Layout", menu: "Tools", disabledReason: "Layout persistence is not implemented yet." },
  { id: "gettingStarted", label: "Getting Started", menu: "Help" },
  { id: "tutorial", label: "Tutorials", menu: "Help" },
  { id: "examples", label: "Examples", menu: "Help" },
  { id: "keyboardShortcuts", label: "Keyboard Shortcuts", menu: "Help" },
  { id: "about", label: "About Atlas Optimization Suite", menu: "Help" }
];

export const ATLAS_PRIMARY_COMMAND_IDS: AtlasCommandId[] = ["inspect", "generateCode", "solve", "search"];
export const ATLAS_HISTORY_COMMAND_IDS: AtlasCommandId[] = ["undo", "redo"];
export const ATLAS_HELP_COMMAND_IDS: AtlasCommandId[] = ["tutorial", "examples"];

export function findAtlasCommand(commandId: AtlasCommandId) {
  return ATLAS_COMMANDS.find((command) => command.id === commandId);
}

export function isAtlasCommandEnabled(command: AtlasCommandDescriptor, context: AtlasCommandContext) {
  if (command.disabledReason) return false;
  return command.enabled ? command.enabled(context) : true;
}

export function createAtlasCommandRegistry(execute: AtlasCommandExecutor) {
  return {
    commands: ATLAS_COMMANDS,
    execute,
    get(commandId: AtlasCommandId) {
      return findAtlasCommand(commandId);
    },
    enabled(commandId: AtlasCommandId, context: AtlasCommandContext) {
      const command = findAtlasCommand(commandId);
      return command ? isAtlasCommandEnabled(command, context) : false;
    }
  };
}
