import type { AtlasCommandId } from "./appCommands";
import type { AtlasCanonicalCommandId } from "../../app/commands/commandTypes";

export function toCanonicalCommandId(commandId: AtlasCommandId): AtlasCanonicalCommandId | null {
  if (commandId.startsWith("view:")) return "view.switchView";
  const aliases: Partial<Record<AtlasCommandId, AtlasCanonicalCommandId>> = {
    newModel: "file.newModel",
    clear: "file.newModel",
    clearDesk: "file.clearDesk",
    saveProject: "file.saveProject",
    loadProject: "file.loadProject",
    export: "file.exportIr",
    import: "file.importIr",
    undo: "edit.undo",
    redo: "edit.redo",
    deleteSelected: "edit.deleteSelected",
    renameSelected: "edit.renameSelected",
    inspect: "run.validate",
    generateCode: "run.generateCode",
    solve: "run.solve",
    evaluate: "run.evaluateCurrent",
    evaluateSolution: "run.evaluateSolution"
  };
  return aliases[commandId] ?? null;
}
