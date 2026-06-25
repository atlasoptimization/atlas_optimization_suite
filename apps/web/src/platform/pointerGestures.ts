import { useRef } from "react";
import type { MouseEvent, PointerEvent } from "react";

export type ContextMenuPosition = {
  x: number;
  y: number;
};

type PointerLikeEvent = PointerEvent<HTMLElement> | MouseEvent<HTMLElement>;

type LongPressContextMenuOptions = {
  onOpenContextMenu: (position: ContextMenuPosition) => void;
  onLongPressStart?: () => void;
  delayMs?: number;
  moveTolerance?: number;
};

export function openContextMenu(
  event: PointerLikeEvent,
  onOpenContextMenu: (position: ContextMenuPosition) => void
) {
  event.preventDefault();
  onOpenContextMenu({ x: event.clientX, y: event.clientY });
}

export function useLongPressContextMenu({
  onOpenContextMenu,
  onLongPressStart,
  delayMs = 560,
  moveTolerance = 10
}: LongPressContextMenuOptions) {
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const didOpenRef = useRef(false);

  function cancelLongPress() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startRef.current = null;
  }

  function startLongPress(event: PointerEvent<HTMLElement>) {
    cancelLongPress();
    didOpenRef.current = false;

    if (event.pointerType === "mouse" || event.button !== 0) return;

    startRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };
    timerRef.current = window.setTimeout(() => {
      const start = startRef.current;
      if (!start) return;

      didOpenRef.current = true;
      onLongPressStart?.();
      onOpenContextMenu({ x: start.x, y: start.y });
      cancelLongPress();
    }, delayMs);
  }

  function updateLongPress(event: PointerEvent<HTMLElement>) {
    const start = startRef.current;
    if (!start || start.pointerId !== event.pointerId) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) > moveTolerance) {
      cancelLongPress();
    }
  }

  function consumeLongPressOpen() {
    const didOpen = didOpenRef.current;
    didOpenRef.current = false;
    return didOpen;
  }

  return {
    cancelLongPress,
    consumeLongPressOpen,
    onContextMenu: (event: MouseEvent<HTMLElement>) =>
      openContextMenu(event, onOpenContextMenu),
    onPointerDown: startLongPress,
    onPointerMove: updateLongPress,
    onPointerUp: cancelLongPress,
    onPointerCancel: cancelLongPress
  };
}
