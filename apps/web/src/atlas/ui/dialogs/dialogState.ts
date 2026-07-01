export type AtlasDialogState =
  | { type: "none" }
  | { type: "confirm"; title: string; message: string; onConfirm: () => void }
  | { type: "defineObject"; initialKind?: string }
  | { type: "importIr" };

export const CLOSED_ATLAS_DIALOG: AtlasDialogState = { type: "none" };

export function openAtlasDialog(dialog: Exclude<AtlasDialogState, { type: "none" }>): AtlasDialogState {
  return dialog;
}

export function closeAtlasDialog(): AtlasDialogState {
  return CLOSED_ATLAS_DIALOG;
}
