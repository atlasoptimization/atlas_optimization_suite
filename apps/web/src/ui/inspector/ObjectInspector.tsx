import type { DeckCard } from "../../core/types/card";
import type { ArrowObject, CardInstance, NoteKind, NoteObject } from "../../core/types/session";
import type { CardDisplayMode } from "../../core/types/view";
import { CardInspector } from "./CardInspector";
import { NoteEditor } from "../notes/NoteEditor";
import { ArrowInspector } from "../drawing/ArrowInspector";

type ObjectInspectorProps = {
  card: DeckCard | null;
  selectedInstance: CardInstance | null;
  note: NoteObject | null;
  arrow: ArrowObject | null;
  onDisplayModeChange: (displayMode: CardDisplayMode) => void;
  onRevealCard: () => void;
  onHideCard: () => void;
  onToggleAblatedCard: () => void;
  onNoteTextChange: (text: string) => void;
  onNoteKindChange: (noteKind: NoteKind) => void;
  onDeleteNote: () => void;
  onArrowLabelChange: (label: string) => void;
  onArrowStrokeWidthChange: (strokeWidth: number) => void;
  onDeleteArrow: () => void;
};

export function ObjectInspector({
  card,
  selectedInstance,
  note,
  arrow,
  onDisplayModeChange,
  onRevealCard,
  onHideCard,
  onToggleAblatedCard,
  onNoteTextChange,
  onNoteKindChange,
  onDeleteNote,
  onArrowLabelChange,
  onArrowStrokeWidthChange,
  onDeleteArrow
}: ObjectInspectorProps) {
  if (arrow) {
    return (
      <div>
        <h2>Inspector</h2>
        <div className="inspector-card arrow-inspector-card">
          <ArrowInspector
            arrow={arrow}
            onLabelChange={onArrowLabelChange}
            onStrokeWidthChange={onArrowStrokeWidthChange}
            onDelete={onDeleteArrow}
          />
        </div>
      </div>
    );
  }

  if (note) {
    return (
      <div>
        <h2>Inspector</h2>
        <div className="inspector-card note-inspector-card">
          <h3>Note</h3>
          <NoteEditor
            note={note}
            onTextChange={onNoteTextChange}
            onKindChange={onNoteKindChange}
            onDelete={onDeleteNote}
          />
        </div>
      </div>
    );
  }

  if (!card) {
    return (
      <div>
        <h2>Inspector</h2>
        <p className="muted">Select an object.</p>
      </div>
    );
  }

  return (
    <CardInspector
      card={card}
      selectedInstance={selectedInstance}
      onDisplayModeChange={onDisplayModeChange}
      onReveal={onRevealCard}
      onHide={onHideCard}
      onToggleAblated={onToggleAblatedCard}
    />
  );
}
