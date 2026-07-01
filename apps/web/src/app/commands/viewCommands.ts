import type { AtlasCommandDescriptor } from "./commandTypes";

export const viewCommands: AtlasCommandDescriptor[] = [
  {
    id: "view.switchView",
    label: "Switch View",
    menu: "View",
    enabled: (_context, payload) => typeof payload?.view === "string",
    execute: (_context, payload) => ({ message: `Switch to ${String(payload?.view)} view.` })
  },
  {
    id: "view.togglePanel",
    label: "Toggle Panel",
    menu: "View",
    enabled: (_context, payload) => typeof payload?.panelId === "string",
    execute: (_context, payload) => ({ message: `Toggle ${String(payload?.panelId)} panel.` })
  }
];
