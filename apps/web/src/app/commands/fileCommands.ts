import { EMPTY_ATLAS_STATE, clearAtlasDesk } from "../../atlas/core/cards";
import { createStateTransaction } from "../transactions/applyTransaction";
import type { AtlasCommandDescriptor } from "./commandTypes";

export const fileCommands: AtlasCommandDescriptor[] = [
  {
    id: "file.newModel",
    label: "New Model",
    shortcut: "Ctrl/Cmd+N",
    menu: "File",
    enabled: () => true,
    execute: (context) => ({
      transaction: createStateTransaction("New model", context.state, EMPTY_ATLAS_STATE),
      staleModelDerivedState: true
    })
  },
  {
    id: "file.clearDesk",
    label: "Clear Desk",
    menu: "File",
    enabled: (context) => context.state.cards.some((card) => card.workspaceRole === "reference") || context.state.connections.length > 0,
    execute: (context) => ({
      transaction: createStateTransaction("Clear desk", context.state, clearAtlasDesk(context.state)),
      staleModelDerivedState: true
    })
  },
  { id: "file.saveProject", label: "Save Project", shortcut: "Ctrl/Cmd+S", menu: "File", enabled: () => true, execute: () => ({ message: "Save project requested." }) },
  { id: "file.loadProject", label: "Load Project", shortcut: "Ctrl/Cmd+O", menu: "File", enabled: () => true, execute: () => ({ message: "Load project requested." }) },
  { id: "file.exportIr", label: "Export Atlas IR", menu: "File", enabled: () => true, execute: () => ({ message: "Export IR requested." }) },
  { id: "file.importIr", label: "Import Atlas IR", menu: "File", enabled: () => true, execute: () => ({ message: "Import IR requested." }) }
];
