import { useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { NoteObject } from "../../core/types/session";

type NoteObjectViewProps = {
  note: NoteObject;
  selected: boolean;
  zoomScale: number;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onTextChange: (text: string) => void;
  onOpenContextMenu: (position: { x: number; y: number }) => void;
};

export function NoteObjectView({
  note,
  selected,
  zoomScale,
  onSelect,
  onMove,
  onTextChange,
  onOpenContextMenu
}: NoteObjectViewProps) {
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function stopNoteEvent(event: PointerEvent | MouseEvent) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  }

  return (
    <div
      className={`note-object note-${note.noteKind} ${selected ? "selected" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      style={{ left: note.x, top: note.y }}
      onClick={(event) => {
        stopNoteEvent(event);
        onSelect();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        stopNoteEvent(event);
        onSelect();
        onOpenContextMenu({ x: event.clientX, y: event.clientY });
      }}
      onPointerDown={(event) => {
        stopNoteEvent(event);
        if (event.button !== 0) return;
        dragStartRef.current = { x: event.clientX, y: event.clientY, moved: false };
        setIsDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const dragStart = dragStartRef.current;
        if (!dragStart) return;
        stopNoteEvent(event);
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) dragStart.moved = true;
        onMove(dx / zoomScale, dy / zoomScale);
        dragStart.x = event.clientX;
        dragStart.y = event.clientY;
      }}
      onPointerUp={(event) => {
        stopNoteEvent(event);
        dragStartRef.current = null;
        setIsDragging(false);
      }}
      onPointerCancel={(event) => {
        stopNoteEvent(event);
        dragStartRef.current = null;
        setIsDragging(false);
      }}
    >
      <textarea
        value={note.text}
        placeholder="Note"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onChange={(event) => onTextChange(event.target.value)}
      />
      <span>{note.noteKind}</span>
    </div>
  );
}
