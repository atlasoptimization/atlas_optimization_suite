import type { DeckAction } from "../../core/types/action";

export type ContextMenuRangeControl = {
  type: "range";
  min: number;
  max: number;
  step: number;
  value: number;
  actionForValue: (value: number) => DeckAction;
};

export type ContextMenuItem = {
  id: string;
  label: string;
  icon?: string;
  enabled?: boolean;
  action?: DeckAction | DeckAction[];
  href?: string;
  onClick?: () => void;
  control?: ContextMenuRangeControl;
  children?: ContextMenuItem[];
};

export type ContextMenuPosition = {
  x: number;
  y: number;
};
