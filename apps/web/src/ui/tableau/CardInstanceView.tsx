import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";
import type { DeckCard } from "../../core/types/card";
import type { CardInstance } from "../../core/types/session";
import { domainClass } from "../../core/constants/domains";
import { isAspectCard } from "../../core/constants/aspect";
import { useLongPressContextMenu } from "../../platform/pointerGestures";
import { CardView } from "../cards/CardView";
import { HiddenCardView } from "../cards/HiddenCardView";
import { OrientationBadge } from "../cards/OrientationBadge";

type CardInstanceViewProps = {
  card: DeckCard;
  placed: CardInstance;
  selected: boolean;
  emphasized: boolean;
  newlyDrawn: boolean;
  hasModifierAttachment: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
  onCycleOrientation: () => void;
  onOpenContextMenu: (position: { x: number; y: number }) => void;
  onReadingZoom: () => void;
  zoomScale: number;
};

export function CardInstanceView({
  card,
  placed,
  selected,
  emphasized,
  newlyDrawn,
  hasModifierAttachment,
  onSelect,
  onMove,
  onCycleOrientation,
  onOpenContextMenu,
  onReadingZoom,
  zoomScale
}: CardInstanceViewProps) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    didMove: boolean;
    isMoving: boolean;
    target: HTMLElement | null;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const clickActionTimeoutRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const contextMenuGesture = useLongPressContextMenu({
    onOpenContextMenu: (position) => {
      onSelect();
      onOpenContextMenu(position);
    },
    onLongPressStart: () => {
      endDrag();
    }
  });

  function endDrag(pointerId?: number) {
    const drag = dragRef.current;
    if (!drag) return;
    if (pointerId !== undefined && drag.pointerId !== pointerId) return;

    if (drag.target?.hasPointerCapture(drag.pointerId)) {
      try {
        drag.target.releasePointerCapture(drag.pointerId);
      } catch {
        // Pointer capture may already be gone after cancel/lostcapture.
      }
    }

    suppressNextClickRef.current = drag.didMove || suppressNextClickRef.current;
    dragRef.current = null;
    setIsDragging(false);
    contextMenuGesture.cancelLongPress();
  }

  useEffect(() => {
    function handleBlur() {
      endDrag();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") endDrag();
    }

    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown);
      if (clickActionTimeoutRef.current !== null) {
        window.clearTimeout(clickActionTimeoutRef.current);
      }
    };
  }, []);

  function cancelPendingClickAction() {
    if (clickActionTimeoutRef.current === null) return;
    window.clearTimeout(clickActionTimeoutRef.current);
    clickActionTimeoutRef.current = null;
  }

  function stopCardEvent(event: PointerEvent | MouseEvent) {
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  }

  return (
    <div
      className={`tableau-card ${selected ? "selected" : ""} ${isDragging ? "dragging" : ""} ${
        placed.displayMode === "pdf-both" ||
        (placed.face === "both" &&
          (placed.displayMode === "card-face" ||
            placed.displayMode === "card-face-and-active-effect"))
          ? "wide"
          : ""
      } ${
        placed.displayMode === "card-face-and-active-effect" ? "with-effect-caption" : ""
      } ${emphasized ? "effect-selected" : ""} ${
        newlyDrawn ? "effect-new-card" : ""
      } ${hasModifierAttachment ? "modifier-attached" : ""} ${
        placed.ablated ? "ablated" : ""
      } ${domainClass(card.domain)}`}
      style={{
        left: placed.x,
        top: placed.y,
        transform: `rotate(${placed.rotation}deg) scale(${placed.scale})`
      }}
      data-testid="card-instance"
      data-card-instance-id={placed.instanceId}
      onClick={(event) => {
        stopCardEvent(event);
        if (contextMenuGesture.consumeLongPressOpen()) return;
        if (suppressNextClickRef.current) {
          suppressNextClickRef.current = false;
          return;
        }
        if (!selected) {
          cancelPendingClickAction();
          onSelect();
          return;
        }
        if (event.detail > 1 || placed.hidden || isAspectCard(card)) return;
        cancelPendingClickAction();
        clickActionTimeoutRef.current = window.setTimeout(() => {
          clickActionTimeoutRef.current = null;
          onCycleOrientation();
        }, 180);
      }}
      onDoubleClick={(event) => {
        stopCardEvent(event);
        cancelPendingClickAction();
        if (suppressNextClickRef.current || dragRef.current?.didMove) return;
        onReadingZoom();
      }}
      onContextMenu={(event) => {
        stopCardEvent(event);
        contextMenuGesture.onContextMenu(event);
      }}
      onPointerDown={(event) => {
        stopCardEvent(event);
        if (event.button !== 0) return;
        dragRef.current = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          lastX: event.clientX,
          lastY: event.clientY,
          didMove: false,
          isMoving: false,
          target: event.currentTarget
        };
        contextMenuGesture.onPointerDown(event);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        stopCardEvent(event);
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if ((event.buttons & 1) !== 1) {
          endDrag(event.pointerId);
          return;
        }
        contextMenuGesture.onPointerMove(event);
        const totalDx = event.clientX - drag.startX;
        const totalDy = event.clientY - drag.startY;
        if (!drag.isMoving && Math.hypot(totalDx, totalDy) < 4) return;

        if (!drag.isMoving) {
          drag.isMoving = true;
          setIsDragging(true);
        }
        drag.didMove = true;

        const dx = event.clientX - drag.lastX;
        const dy = event.clientY - drag.lastY;
        onMove(dx / zoomScale, dy / zoomScale);
        drag.lastX = event.clientX;
        drag.lastY = event.clientY;
      }}
      onPointerUp={(event) => {
        stopCardEvent(event);
        contextMenuGesture.onPointerUp();
        endDrag(event.pointerId);
      }}
      onPointerCancel={(event) => {
        stopCardEvent(event);
        contextMenuGesture.onPointerCancel();
        endDrag(event.pointerId);
      }}
      onLostPointerCapture={(event) => {
        endDrag(event.pointerId);
      }}
    >
      {placed.hidden ? (
        <HiddenCardView domain={card.domain} />
      ) : (
        <CardView
          card={card}
          displayMode={placed.displayMode}
          orientation={isAspectCard(card) ? "modifier" : placed.orientation}
          face={placed.face}
        />
      )}
      {hasModifierAttachment && <span className="modifier-attachment-indicator" />}
      {!placed.hidden && <OrientationBadge orientation={isAspectCard(card) ? "modifier" : placed.orientation} />}
    </div>
  );
}
