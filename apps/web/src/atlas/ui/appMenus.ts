import { ATLAS_COMMANDS, type AtlasCommandDescriptor } from "./appCommands";

export type AtlasMenuDescriptor = {
  id: string;
  label: string;
  commands: AtlasCommandDescriptor[];
};

export const ATLAS_MENU_ORDER = ["File", "Edit", "View", "Run", "Examples", "Tools", "Help"];

export function buildAtlasMenus(commands: AtlasCommandDescriptor[] = ATLAS_COMMANDS): AtlasMenuDescriptor[] {
  return ATLAS_MENU_ORDER.map((label) => ({
    id: label.toLowerCase(),
    label,
    commands: commands.filter((command) => command.menu === label)
  })).filter((menu) => menu.commands.length > 0);
}
