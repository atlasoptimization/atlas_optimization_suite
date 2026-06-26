import { useRef, useState, type PointerEvent } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { AtlasCard, AtlasCardModuleKind, AtlasCardQuery, AtlasGroup, AtlasPosition } from "../../core/types";
import type { AtlasRuntimeDiagnostic } from "../../core/runtimeDiagnostics";
import { AtlasCardView } from "./AtlasCardView";
import { AtlasGroupView } from "./AtlasGroupView";

const ATLAS_WORLD_SIZE = 4200;
const ATLAS_INITIAL_SCALE = 0.72;

type AtlasWorkbenchProps = {
  cards: AtlasCard[];
  groups: AtlasGroup[];
  queries: AtlasCardQuery[];
  highlightedCardIds: Set<string>;
  dependencyPropertyNamesByCardId: Record<string, Set<string>>;
  diagnosticsByCardId: Record<string, AtlasRuntimeDiagnostic[]>;
  selectedCardId: string | null;
  selectedGroupId: string | null;
  onSelectCard: (cardId: string | null) => void;
  onSelectGroup: (groupId: string | null) => void;
  onMoveCard: (cardId: string, position: AtlasPosition) => void;
  onAttachModule: (cardId: string, kind: AtlasCardModuleKind, position: AtlasPosition) => void;
  onMoveModule: (cardId: string, moduleId: string, position: AtlasPosition) => void;
  onSelectDiagnostic: (diagnostic: AtlasRuntimeDiagnostic) => void;
};

type DragState = {
  cardId: string;
  pointerId: number;
  lastClientX: number;
  lastClientY: number;
  position: AtlasPosition;
};

export function AtlasWorkbench({
  cards,
  groups,
  queries,
  highlightedCardIds,
  dependencyPropertyNamesByCardId,
  diagnosticsByCardId,
  selectedCardId,
  selectedGroupId,
  onSelectCard,
  onSelectGroup,
  onMoveCard,
  onAttachModule,
  onMoveModule,
  onSelectDiagnostic
}: AtlasWorkbenchProps) {
  const dragRef = useRef<DragState | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, AtlasPosition>>({});

  function startCardDrag(event: PointerEvent<HTMLElement>, card: AtlasCard) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectCard(card.id);
    dragRef.current = {
      cardId: card.id,
      pointerId: event.pointerId,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      position: draftPositions[card.id] ?? card.position
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCardDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if ((event.buttons & 1) !== 1) {
      finishCardDrag(event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const nextPosition = {
      x: Math.round(drag.position.x + event.clientX - drag.lastClientX),
      y: Math.round(drag.position.y + event.clientY - drag.lastClientY)
    };
    dragRef.current = {
      ...drag,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      position: nextPosition
    };
    setDraftPositions((current) => ({ ...current, [drag.cardId]: nextPosition }));
  }

  function finishCardDrag(event: PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDraftPositions((current) => {
      const next = { ...current };
      delete next[drag.cardId];
      return next;
    });
    onMoveCard(drag.cardId, drag.position);
  }

  return (
    <section className="atlas-workbench" aria-label="Atlas card desk">
      <TransformWrapper
        minScale={0.18}
        maxScale={2.4}
        initialScale={ATLAS_INITIAL_SCALE}
        centerOnInit
        centerZoomedOut={false}
        limitToBounds={false}
        panning={{ excluded: ["atlas-card"] }}
        doubleClick={{ disabled: true }}
      >
        <TransformComponent
          wrapperClass="atlas-transform-wrapper"
          contentClass="atlas-transform-content"
          contentStyle={{ width: ATLAS_WORLD_SIZE, height: ATLAS_WORLD_SIZE }}
        >
          <div
            className="atlas-workbench-world"
            data-testid="atlas-workbench-world"
            style={{ width: ATLAS_WORLD_SIZE, height: ATLAS_WORLD_SIZE }}
            onPointerDown={() => {
              onSelectCard(null);
              onSelectGroup(null);
            }}
          >
            <div className="atlas-workbench-grid" />
            {cards.length === 0 && groups.length === 0 && (
              <div className="atlas-empty-state">
                <p className="atlas-eyebrow">Infinite card desk</p>
                <h1>Build optimization models from typed cards.</h1>
                <p>
                  Create objects, decisions, data, functions, objectives, and constraints from the
                  toolbar. Drag cards across the desk, select them to inspect details, and keep the
                  model generic until evaluation and solving are added.
                </p>
              </div>
            )}

            {groups.map((group) => (
              <AtlasGroupView
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={(groupId) => onSelectGroup(groupId)}
              />
            ))}

            {cards.map((card) => (
              <AtlasCardView
                key={card.id}
                card={{
                  ...card,
                  position: draftPositions[card.id] ?? card.position
                }}
                allCards={cards}
                queries={queries}
                dependencyPropertyNames={dependencyPropertyNamesByCardId[card.id] ?? new Set()}
                diagnostics={diagnosticsByCardId[card.id] ?? []}
                selected={card.id === selectedCardId}
                highlighted={highlightedCardIds.has(card.id)}
                onPointerDown={(event) => startCardDrag(event, card)}
                onPointerMove={moveCardDrag}
                onPointerUp={finishCardDrag}
                onPointerCancel={finishCardDrag}
                onAttachModule={onAttachModule}
                onMoveModule={onMoveModule}
                onSelectDiagnostic={onSelectDiagnostic}
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </section>
  );
}
