import { atlasEventLog } from "../debug/eventLog";
import { undo, redo, type AtlasUndoRedoStore } from "../transactions/undoRedoStore";
import type {
  AtlasCanonicalCommandId,
  AtlasCommandContext,
  AtlasCommandDescriptor,
  AtlasCommandPayload
} from "./commandTypes";
import { fileCommands } from "./fileCommands";
import { modelCommands } from "./modelCommands";
import { runCommands } from "./runCommands";
import { viewCommands } from "./viewCommands";
import { workspaceCommands } from "./workspaceCommands";

const editCommands: AtlasCommandDescriptor[] = [
  {
    id: "edit.undo",
    label: "Undo",
    shortcut: "Ctrl/Cmd+Z",
    menu: "Edit",
    enabled: (context) => Boolean(context.canUndo),
    execute: () => ({ message: "Undo requested." })
  },
  {
    id: "edit.redo",
    label: "Redo",
    shortcut: "Ctrl/Cmd+Shift+Z",
    menu: "Edit",
    enabled: (context) => Boolean(context.canRedo),
    execute: () => ({ message: "Redo requested." })
  },
  {
    id: "edit.deleteSelected",
    label: "Delete Selected",
    shortcut: "Delete",
    menu: "Edit",
    enabled: (context) =>
      Boolean(context.state.selectedCardId || context.state.selectedConnectionId || context.state.selectedGroupId),
    execute: () => ({ message: "Delete selected requested." })
  },
  {
    id: "edit.renameSelected",
    label: "Rename Selected",
    menu: "Edit",
    enabled: (context) => Boolean(context.state.selectedCardId),
    execute: () => ({ message: "Rename selected requested." })
  }
];

const dialogCommands: AtlasCommandDescriptor[] = [
  { id: "dialog.openDefineObject", label: "Define Object", menu: "Dialog", enabled: () => true, execute: () => ({ message: "Open define object dialog." }) },
  { id: "dialog.openConfirm", label: "Confirm", menu: "Dialog", enabled: () => true, execute: () => ({ message: "Open confirm dialog." }) }
];

export const REQUIRED_ATLAS_COMMAND_IDS: AtlasCanonicalCommandId[] = [
  "file.newModel",
  "file.clearDesk",
  "file.saveProject",
  "file.loadProject",
  "file.exportIr",
  "file.importIr",
  "edit.undo",
  "edit.redo",
  "edit.deleteSelected",
  "edit.renameSelected",
  "view.switchView",
  "view.togglePanel",
  "workspace.placeReference",
  "workspace.deleteReference",
  "workspace.connectPorts",
  "workspace.deleteConnection",
  "model.defineVariable",
  "model.defineParameter",
  "model.defineConstant",
  "model.defineAtom",
  "model.deleteCanonicalObject",
  "run.validate",
  "run.generateCode",
  "run.solve",
  "run.evaluateCurrent",
  "run.evaluateSolution",
  "dialog.openDefineObject",
  "dialog.openConfirm"
];

export const atlasCommandDescriptors: AtlasCommandDescriptor[] = [
  ...fileCommands,
  ...editCommands,
  ...viewCommands,
  ...workspaceCommands,
  ...modelCommands,
  ...runCommands,
  ...dialogCommands
];

export function getCommand(commandId: AtlasCanonicalCommandId) {
  return atlasCommandDescriptors.find((command) => command.id === commandId);
}

export function isCommandEnabled(
  commandId: AtlasCanonicalCommandId,
  context: AtlasCommandContext,
  payload?: AtlasCommandPayload
) {
  const command = getCommand(commandId);
  return command ? command.enabled(context, payload) : false;
}

export async function executeCommand(
  commandId: AtlasCanonicalCommandId,
  context: AtlasCommandContext,
  payload?: AtlasCommandPayload
) {
  const command = getCommand(commandId);
  if (!command) throw new Error(`Unknown Atlas command ${commandId}.`);
  atlasEventLog.record({ type: "command", commandId, payload, message: `Executing ${command.label}.` });
  const result = await command.execute(context, payload);
  if (result.transaction) {
    atlasEventLog.record({
      type: "transaction",
      commandId,
      transactionId: result.transaction.id,
      message: result.transaction.label,
      summary: `${result.transaction.affectedObjectIds.length} affected object(s).`
    });
  }
  return result;
}

export function executeUndoRedoCommand(commandId: "edit.undo" | "edit.redo", store: AtlasUndoRedoStore) {
  atlasEventLog.record({ type: "command", commandId, message: commandId === "edit.undo" ? "Undo." : "Redo." });
  return commandId === "edit.undo" ? undo(store) : redo(store);
}
