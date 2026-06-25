import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

type TopMenuPanelProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function TopMenuPanel({ title, onClose, children }: TopMenuPanelProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest("[data-top-menu-trigger]")) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="top-menu-panel" ref={panelRef}>
      <div className="top-menu-panel-header">
        <h2>{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close panel">
          Close
        </button>
      </div>
      <div className="top-menu-panel-body">{children}</div>
    </div>
  );
}
