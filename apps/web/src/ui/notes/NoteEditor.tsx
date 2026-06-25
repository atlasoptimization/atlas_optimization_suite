import type { NoteKind, NoteObject } from "../../core/types/session";

const NOTE_KINDS: { value: NoteKind; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "insight", label: "Insight" },
  { value: "problem", label: "Problem" },
  { value: "opportunity", label: "Opportunity" },
  { value: "action", label: "Next move" },
  { value: "question", label: "Question" }
];

type NoteEditorProps = {
  note: NoteObject;
  onTextChange: (text: string) => void;
  onKindChange: (noteKind: NoteKind) => void;
  onDelete: () => void;
};

export function NoteEditor({
  note,
  onTextChange,
  onKindChange,
  onDelete
}: NoteEditorProps) {
  return (
    <div className="note-editor">
      <label>
        Kind
        <select
          value={note.noteKind}
          onChange={(event) => onKindChange(event.target.value as NoteKind)}
        >
          {NOTE_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Text
        <textarea
          value={note.text}
          onChange={(event) => onTextChange(event.target.value)}
          placeholder="Write a note..."
        />
      </label>

      {note.attachedTo && <p className="muted">Attached to: {note.attachedTo}</p>}

      <button type="button" onClick={onDelete}>
        Delete note
      </button>
    </div>
  );
}
