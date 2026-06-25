import { useEffect, useRef, useState } from "react";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { Pile } from "../../core/types/session";
import { DrawDialog } from "../draw/DrawDialog";
import {
  buildCustomDrawCandidateRefs,
  CustomDrawDialog,
  type CustomDrawRecipe
} from "../draw/CustomDrawDialog";
import { DrawActionsMenu } from "./DrawActionsMenu";

type ActionMenuProps = {
  cards: DeckCard[];
  piles: Pile[];
  onDrawNext: () => void;
  onDrawDomain: (domain: string) => void;
  onDrawDomainMany: (domain: string, count: number) => void;
  onChooseOneFromN: (domain: string, count: number) => void;
  onDispatchAction: (action: DeckAction) => void;
};

export function ActionMenu({
  cards,
  piles,
  onDrawNext,
  onDrawDomain,
  onDrawDomainMany,
  onChooseOneFromN,
  onDispatchAction
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [drawDialogOpen, setDrawDialogOpen] = useState(false);
  const [customDrawOpen, setCustomDrawOpen] = useState(false);
  const [lastCustomDrawRecipe, setLastCustomDrawRecipe] = useState<CustomDrawRecipe | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open && !drawDialogOpen && !customDrawOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) return;
      setOpen(false);
      setDrawDialogOpen(false);
      setCustomDrawOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      setDrawDialogOpen(false);
      setCustomDrawOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [customDrawOpen, drawDialogOpen, open]);

  function repeatLastCustomDraw() {
    if (!lastCustomDrawRecipe) return;
    const candidates = buildCustomDrawCandidateRefs(lastCustomDrawRecipe, cards, piles);
    if (candidates.length === 0) return;
    onDispatchAction({
      type: "draw.startFilteredChoice",
      cards: candidates
    });
    setOpen(false);
  }

  return (
    <div className="action-menu" ref={rootRef}>
      <button
        type="button"
        className="action-menu-trigger"
        data-testid="menu-actions"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        Actions
      </button>

      {open && (
        <div className="action-menu-popover">
          <details open>
            <summary>Draw</summary>
            <button type="button" onClick={() => setDrawDialogOpen(true)}>
              Filtered draw...
            </button>
            <button type="button" onClick={() => setCustomDrawOpen(true)}>
              Custom Draw...
            </button>
            <button
              type="button"
              onClick={repeatLastCustomDraw}
              disabled={!lastCustomDrawRecipe}
              title={lastCustomDrawRecipe ? "Repeat the last custom draw recipe." : "Create a Custom Draw first."}
            >
              Repeat last Custom Draw
            </button>
            <DrawActionsMenu
              onDrawNext={() => {
                onDrawNext();
                setOpen(false);
              }}
              onDrawDomain={(domain) => {
                onDrawDomain(domain);
                setOpen(false);
              }}
              onDrawDomainMany={(domain, count) => {
                onDrawDomainMany(domain, count);
                setOpen(false);
              }}
              onChooseOneFromN={(domain, count) => {
                onChooseOneFromN(domain, count);
                setOpen(false);
              }}
            />
          </details>
        </div>
      )}

      {drawDialogOpen && (
        <div className="action-menu-dialog">
          <div className="action-menu-dialog-header">
            <h2>Filtered draw</h2>
            <button type="button" onClick={() => setDrawDialogOpen(false)}>
              Close
            </button>
          </div>
          <DrawDialog
            cards={cards}
            piles={piles}
            onDispatchAction={onDispatchAction}
            onClose={() => {
              setDrawDialogOpen(false);
              setOpen(false);
            }}
          />
        </div>
      )}

      {customDrawOpen && (
        <div className="action-menu-dialog custom-draw-menu-dialog">
          <div className="action-menu-dialog-header">
            <h2>Custom Draw</h2>
            <button type="button" onClick={() => setCustomDrawOpen(false)}>
              Close
            </button>
          </div>
          <CustomDrawDialog
            cards={cards}
            piles={piles}
            initialRecipe={lastCustomDrawRecipe}
            onDispatchAction={onDispatchAction}
            onSaveLastRecipe={setLastCustomDrawRecipe}
            onClose={() => {
              setCustomDrawOpen(false);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
