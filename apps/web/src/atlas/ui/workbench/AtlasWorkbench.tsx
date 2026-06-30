import { useRef, useState, type DragEvent, type PointerEvent } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { AtlasAtomSpec } from "../../core/atoms";
import type { AtlasCvxpyObjectMetadata } from "../../api/backendClient";
import type {
  AtlasCard,
  AtlasCardModuleKind,
  AtlasCardQuery,
  AtlasConnection,
  AtlasConnectionEndpoint,
  AtlasGroup,
  AtlasPosition
} from "../../core/types";
import type { AtlasRuntimeDiagnostic } from "../../core/runtimeDiagnostics";
import { AtlasCardView } from "./AtlasCardView";
import { AtlasGroupView } from "./AtlasGroupView";

const ATLAS_WORLD_SIZE = 4200;
const ATLAS_INITIAL_SCALE = 0.72;

type AtlasWorkbenchProps = {
  cards: AtlasCard[];
  groups: AtlasGroup[];
  queries: AtlasCardQuery[];
  connections: AtlasConnection[];
  highlightedCardIds: Set<string>;
  dependencyPropertyNamesByCardId: Record<string, Set<string>>;
  diagnosticsByCardId: Record<string, AtlasRuntimeDiagnostic[]>;
  metadataByCardId: Record<string, AtlasCvxpyObjectMetadata>;
  selectedCardId: string | null;
  selectedGroupId: string | null;
  onSelectCard: (cardId: string | null) => void;
  onSelectGroup: (groupId: string | null) => void;
  onMoveCard: (cardId: string, position: AtlasPosition) => void;
  onCreateWorkspaceReference: (modelObjectId: string, position: AtlasPosition) => void;
  onCreateAtomFromSpec: (atomSpec: AtlasAtomSpec, position: AtlasPosition) => void;
  onCreateConnection: (source: AtlasConnectionEndpoint, target: AtlasConnectionEndpoint) => void;
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

type ClientPosition = {
  x: number;
  y: number;
};

export function nextDraggedAtlasPosition(
  position: AtlasPosition,
  lastClient: ClientPosition,
  nextClient: ClientPosition,
  scale: number
): AtlasPosition {
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return {
    x: Math.round(position.x + (nextClient.x - lastClient.x) / safeScale),
    y: Math.round(position.y + (nextClient.y - lastClient.y) / safeScale)
  };
}

export function AtlasWorkbench({
  cards,
  groups,
  queries,
  connections,
  highlightedCardIds,
  dependencyPropertyNamesByCardId,
  diagnosticsByCardId,
  metadataByCardId,
  selectedCardId,
  selectedGroupId,
  onSelectCard,
  onSelectGroup,
  onMoveCard,
  onCreateWorkspaceReference,
  onCreateAtomFromSpec,
  onCreateConnection,
  onAttachModule,
  onMoveModule,
  onSelectDiagnostic
}: AtlasWorkbenchProps) {
  const dragRef = useRef<DragState | null>(null);
  const scaleRef = useRef(ATLAS_INITIAL_SCALE);
  const transformRef = useRef({ scale: ATLAS_INITIAL_SCALE, positionX: 0, positionY: 0 });
  const workbenchRef = useRef<HTMLElement | null>(null);
  const [draftPositions, setDraftPositions] = useState<Record<string, AtlasPosition>>({});
  const displayedCards = cards.map((card) => ({
    ...card,
    position: draftPositions[card.id] ?? card.position
  }));

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
    const nextPosition = nextDraggedAtlasPosition(
      drag.position,
      { x: drag.lastClientX, y: drag.lastClientY },
      { x: event.clientX, y: event.clientY },
      scaleRef.current
    );
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

  function referenceDropPosition(event: DragEvent<HTMLElement>): AtlasPosition {
    const rect = workbenchRef.current?.getBoundingClientRect();
    const transform = transformRef.current;
    if (!rect) return { x: 760, y: 660 };
    return {
      x: Math.round((event.clientX - rect.left - transform.positionX) / transform.scale),
      y: Math.round((event.clientY - rect.top - transform.positionY) / transform.scale)
    };
  }

  return (
    <section
      ref={workbenchRef}
      className="atlas-workbench"
      aria-label="Atlas card desk"
      onDragOver={(event) => {
        if (
          event.dataTransfer.types.includes("application/x-atlas-model-object") ||
          event.dataTransfer.types.includes("application/x-atlas-atom-spec")
        ) {
          event.preventDefault();
        }
      }}
      onDrop={(event) => {
        const modelObjectId = event.dataTransfer.getData("application/x-atlas-model-object");
        const rawAtomSpec = event.dataTransfer.getData("application/x-atlas-atom-spec");
        if (!modelObjectId && !rawAtomSpec) return;
        event.preventDefault();
        const position = referenceDropPosition(event);
        if (rawAtomSpec) {
          try {
            onCreateAtomFromSpec(JSON.parse(rawAtomSpec) as AtlasAtomSpec, position);
          } catch {
            return;
          }
        } else {
          onCreateWorkspaceReference(modelObjectId, position);
        }
      }}
    >
      <TransformWrapper
        minScale={0.18}
        maxScale={2.4}
        initialScale={ATLAS_INITIAL_SCALE}
        centerOnInit
        centerZoomedOut={false}
        limitToBounds={false}
        panning={{ excluded: ["atlas-card"] }}
        doubleClick={{ disabled: true }}
        onTransformed={(_, state) => {
          scaleRef.current = state.scale;
          transformRef.current = {
            scale: state.scale,
            positionX: state.positionX,
            positionY: state.positionY
          };
        }}
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
            {cards.length === 0 && groups.length === 0 && (
              <div className="atlas-empty-state">
                <p className="atlas-eyebrow">CVXPY workbench</p>
                <h1>Build optimization problems from solver primitives.</h1>
                <p>
                  Create variables, parameters, constants, expressions, objectives, and constraints
                  from the Constructor panel. Drag nodes across the desk, inspect metadata, and
                  keep high-level domain objects as future macros over this CVXPY layer.
                </p>
              </div>
            )}

            <svg className="atlas-connection-layer" aria-hidden="true">
              {connections.map((connection) => {
                const line = connectionLine(connection, displayedCards);
                if (!line) return null;
                return (
                  <line
                    key={connection.id}
                    className={`atlas-connection-line ${line.invalid ? "invalid" : ""}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                  />
                );
              })}
            </svg>

            {groups.map((group) => (
              <AtlasGroupView
                key={group.id}
                group={group}
                selected={group.id === selectedGroupId}
                onSelect={(groupId) => onSelectGroup(groupId)}
              />
            ))}

            {displayedCards.map((card) => (
              <AtlasCardView
                key={card.id}
                card={card}
                allCards={cards}
                queries={queries}
                dependencyPropertyNames={dependencyPropertyNamesByCardId[card.id] ?? new Set()}
                diagnostics={diagnosticsByCardId[card.id] ?? []}
                metadata={metadataByCardId[card.id] ?? metadataByCardId[card.modelObjectId ?? ""]}
                selected={card.id === selectedCardId}
                highlighted={highlightedCardIds.has(card.id)}
                onPointerDown={(event) => startCardDrag(event, card)}
                onPointerMove={moveCardDrag}
                onPointerUp={finishCardDrag}
                onPointerCancel={finishCardDrag}
                onAttachModule={onAttachModule}
                onMoveModule={onMoveModule}
                onSelectDiagnostic={onSelectDiagnostic}
                onCreateConnection={onCreateConnection}
              />
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </section>
  );
}

function connectionLine(connection: AtlasConnection, cards: AtlasCard[]) {
  const source = connection.source.nodeId
    ? cards.find((card) => card.id === connection.source.nodeId)
    : null;
  const target = connection.target.nodeId
    ? cards.find((card) => card.id === connection.target.nodeId)
    : null;
  if (!source && !target) return null;
  const sourcePosition = source
    ? portPosition(source, "source", connection.source.port)
    : { x: 0, y: 0 };
  const targetPosition = target
    ? portPosition(target, "target", connection.target.slot)
    : sourcePosition;
  return {
    x1: sourcePosition.x,
    y1: sourcePosition.y,
    x2: targetPosition.x,
    y2: targetPosition.y,
    invalid: !source || !target
  };
}

function portPosition(card: AtlasCard, side: "source" | "target", slot?: string) {
  const width = 220;
  const height = 160;
  const slotOffset = slot === "rhs" || slot === "arg1" || slot === "constraints" ? 118 : 78;
  return {
    x: card.position.x + (side === "source" ? width : 0),
    y: card.position.y + slotOffset + (side === "source" ? height / 8 : 0)
  };
}
