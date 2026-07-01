import type { AtlasDialogState } from "./dialogState";

export function DialogHost({
  dialog,
  onClose
}: {
  dialog: AtlasDialogState;
  onClose: () => void;
}) {
  if (dialog.type === "none") return null;
  if (dialog.type === "confirm") {
    return (
      <div className="atlas-dialog-backdrop" role="presentation">
        <section className="atlas-dialog" role="dialog" aria-label={dialog.title}>
          <h2>{dialog.title}</h2>
          <p>{dialog.message}</p>
          <div className="atlas-inspector-main-actions">
            <button type="button" onClick={dialog.onConfirm}>Confirm</button>
            <button type="button" onClick={onClose}>Cancel</button>
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="atlas-dialog-backdrop" role="presentation">
      <section className="atlas-dialog" role="dialog" aria-label={dialog.type}>
        <h2>{dialog.type}</h2>
        <p>This dialog is registered but not opened by the current workflow yet.</p>
        <button type="button" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}
