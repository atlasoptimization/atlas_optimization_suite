import type { DragEvent, PointerEvent } from "react";
import type { AtlasCvxpyObjectMetadata } from "../../api/backendClient";
import { constraintPreview } from "../../core/constraints";
import { taggedSumPreview } from "../../core/functions";
import { indexedPropertyLabel } from "../../core/indexSets";
import { objectivePreview } from "../../core/objectives";
import type { AtlasCard, AtlasCardModuleKind, AtlasCardQuery, AtlasCardType } from "../../core/types";
import type { AtlasRuntimeDiagnostic } from "../../core/runtimeDiagnostics";
import type { AtlasConnectionEndpoint } from "../../core/types";
import { AtlasAtomNode } from "./AtlasAtomNode";

type AtlasCardViewProps = {
  card: AtlasCard;
  allCards: AtlasCard[];
  queries: AtlasCardQuery[];
  dependencyPropertyNames: Set<string>;
  diagnostics: AtlasRuntimeDiagnostic[];
  metadata?: AtlasCvxpyObjectMetadata;
  selected: boolean;
  highlighted: boolean;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  onPointerUp: (event: PointerEvent<HTMLElement>) => void;
  onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
  onAttachModule?: (cardId: string, kind: AtlasCardModuleKind, position: { x: number; y: number }) => void;
  onMoveModule?: (cardId: string, moduleId: string, position: { x: number; y: number }) => void;
  onSelectDiagnostic?: (diagnostic: AtlasRuntimeDiagnostic) => void;
  onCreateConnection?: (source: AtlasConnectionEndpoint, target: AtlasConnectionEndpoint) => void;
};

const TYPE_LABELS: Record<AtlasCardType, string> = {
  object: "Object",
  decision: "Decision",
  data: "Data",
  function: "Function",
  constraint: "Constraint",
  objective: "Objective"
};

export function AtlasCardView({
  card,
  allCards,
  queries,
  dependencyPropertyNames,
  diagnostics,
  metadata,
  selected,
  highlighted,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onAttachModule,
  onMoveModule,
  onSelectDiagnostic,
  onCreateConnection
}: AtlasCardViewProps) {
  const functionPreview =
    card.type === "function" && card.functionKind === "tagged_sum"
      ? taggedSumPreview(card, queries, allCards)
      : null;
  const objectiveStructure = card.type === "objective" ? objectivePreview(card, allCards) : null;
  const constraintStructure = card.type === "constraint" ? constraintPreview(card, allCards) : null;
  const nodePorts = getNodePorts(card);
  const nodeSlots = getNodeSlots(card);

  return (
    <article
      className={`atlas-card atlas-card-${card.type} ${selected ? "selected" : ""} ${
        highlighted ? "query-highlighted" : ""
      }`}
      data-testid="atlas-card"
      data-card-id={card.id}
      style={{
        transform: `translate(${card.position.x}px, ${card.position.y}px)`
      }}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        const kind = event.dataTransfer.getData("application/x-atlas-module-kind") as
          | AtlasCardModuleKind
          | "";
        if (!kind) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onAttachModule?.(card.id, kind, {
          x: Math.round(event.clientX - rect.left),
          y: Math.round(event.clientY - rect.top)
        });
      }}
    >
      <div className="atlas-card-background-layer" aria-hidden="true" />
      <header>
        <span>{TYPE_LABELS[card.type]}</span>
        <strong>{card.title}</strong>
      </header>
      {metadata && (
        <div className="atlas-cvxpy-badges" aria-label={`${card.title} CVXPY metadata`}>
          {metadata.shape !== undefined && <span>shape {formatShape(metadata.shape)}</span>}
          {metadata.curvature && <span>{metadata.curvature.toLowerCase()}</span>}
          {metadata.is_dcp !== undefined && metadata.is_dcp !== null && (
            <span className={metadata.is_dcp ? "ok" : "error"}>{metadata.is_dcp ? "DCP ok" : "DCP error"}</span>
          )}
        </div>
      )}
      {card.workspaceRole === "reference" && (
        <div className="atlas-card-tags" aria-label={`${card.title} workspace role`}>
          <span className="atlas-tag-chip">reference</span>
        </div>
      )}
      {(nodePorts.length > 0 || nodeSlots.length > 0) && (
        <div className="atlas-node-connectors" aria-label={`${card.title} ports and slots`}>
          {nodeSlots.length > 0 && (
            <div className="atlas-node-slots">
              {nodeSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  className="atlas-node-slot"
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragOver={(event) => {
                    if (event.dataTransfer.types.includes("application/x-atlas-output-port")) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => {
                    const source = readPortDrag(event);
                    if (!source) return;
                    event.preventDefault();
                    event.stopPropagation();
                    onCreateConnection?.(source, {
                      nodeId: card.id,
                      objectId: card.modelObjectId ?? card.id,
                      slot: slot.id
                    });
                  }}
                >
                  <span>{slot.label}</span>
                </button>
              ))}
            </div>
          )}
          {nodePorts.length > 0 && (
            <div className="atlas-node-ports">
              {nodePorts.map((port) => (
                <button
                  key={port.id}
                  type="button"
                  draggable
                  className="atlas-node-port"
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "application/x-atlas-output-port",
                      JSON.stringify({
                        nodeId: card.id,
                        objectId: card.modelObjectId ?? card.id,
                        port: port.id
                      })
                    );
                    event.dataTransfer.effectAllowed = "link";
                  }}
                >
                  <span>{port.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {card.tags.length > 0 && (
        <div className="atlas-card-tags" aria-label={`${card.title} tags`}>
          {card.tags.slice(0, 4).map((tag) => (
            <span key={tag.id} className="atlas-tag-chip">
              {tag.key}={tag.value || "value"}
            </span>
          ))}
          {card.tags.length > 4 && <span className="atlas-tag-chip">+{card.tags.length - 4}</span>}
        </div>
      )}
      {card.properties.length > 0 && (
        <div className="atlas-card-properties" aria-label={`${card.title} properties`}>
          {card.properties.slice(0, 3).map((property) => (
            <span
              key={property.id}
              className={dependencyPropertyNames.has(property.name) ? "dependency-property" : ""}
            >
              <strong>{indexedPropertyLabel(property, allCards)}</strong>
              <em>{formatPropertyValue(property.value)}</em>
            </span>
          ))}
          {card.properties.length > 3 && <span>+{card.properties.length - 3} more</span>}
        </div>
      )}
      {card.atomConfig && <AtlasAtomNode atomConfig={card.atomConfig} metadata={metadata} />}
      {(card.modules ?? []).length > 0 && (
        <div className="atlas-module-layer" aria-label={`${card.title} attached modules`}>
          {(card.modules ?? []).map((module) => (
            <button
              key={module.id}
              type="button"
              className={`atlas-attached-module atlas-module-${module.kind}`}
              style={{
                left: module.position?.x ?? 12,
                top: module.position?.y ?? 12
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                const startX = event.clientX;
                const startY = event.clientY;
                const start = module.position ?? { x: 12, y: 12 };
                const target = event.currentTarget;
                target.setPointerCapture(event.pointerId);
                function move(moveEvent: globalThis.PointerEvent) {
                  onMoveModule?.(card.id, module.id, {
                    x: Math.round(start.x + moveEvent.clientX - startX),
                    y: Math.round(start.y + moveEvent.clientY - startY)
                  });
                }
                function end() {
                  window.removeEventListener("pointermove", move);
                  window.removeEventListener("pointerup", end);
                }
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", end, { once: true });
              }}
            >
              <span>{module.kind}</span>
              <strong>{module.label}</strong>
              {module.value && <em>{module.value}{module.unit ? ` ${module.unit}` : ""}</em>}
            </button>
          ))}
        </div>
      )}
      {diagnostics.length > 0 && (
        <aside className="atlas-card-runtime-diagnostics" aria-label={`${card.title} runtime diagnostics`}>
          {diagnostics.slice(0, 4).map((diagnostic) => (
            <button
              key={diagnostic.diagnosticId}
              type="button"
              className={`atlas-runtime-diagnostic ${diagnostic.status}`}
              onClick={(event) => {
                event.stopPropagation();
                onSelectDiagnostic?.(diagnostic);
              }}
            >
              <span>{diagnostic.label}</span>
              <strong>{diagnostic.value}{diagnostic.unit ? ` ${diagnostic.unit}` : ""}</strong>
            </button>
          ))}
        </aside>
      )}
      {card.type === "decision" && card.decision && (
        <div className="atlas-function-preview" aria-label={`${card.title} decision metadata`}>
          <span>
            <strong>Variable</strong>
            <em>{card.decision.variableType}</em>
          </span>
          <span>
            <strong>Bounds</strong>
            <em>
              {card.decision.lowerBound ?? "-∞"} to {card.decision.upperBound ?? "∞"}
            </em>
          </span>
        </div>
      )}
      {card.type === "data" && card.data && (
        <div className="atlas-function-preview" aria-label={`${card.title} CSV data preview`}>
          <span>
            <strong>{card.data.indexSet ? "Index set" : "CSV"}</strong>
            <em>{card.data.indexSet?.name ?? card.data.fileName}</em>
          </span>
          <span>
            <strong>{card.data.indexSet ? "Elements" : "Rows"}</strong>
            <em>{card.data.indexSet?.elements.length ?? card.data.rowCount}</em>
          </span>
        </div>
      )}
      {functionPreview && (
        <div className="atlas-function-preview" aria-label={`${card.title} TaggedSum preview`}>
          <span>
            <strong>Query</strong>
            <em>{functionPreview.queryName}</em>
          </span>
          <span>
            <strong>Expression</strong>
            <em>{functionPreview.expressionLabel}</em>
          </span>
          <span>
            <strong>Matches</strong>
            <em>{functionPreview.matchCount}</em>
          </span>
        </div>
      )}
      {objectiveStructure && (
        <div className="atlas-function-preview" aria-label={`${card.title} objective preview`}>
          <span>
            <strong>{objectiveStructure.directionLabel}</strong>
            <em>{objectiveStructure.termCount} terms</em>
          </span>
          {objectiveStructure.functionNames.slice(0, 2).map((name, index) => (
            <span key={`${name}-${index}`}>
              <strong>Term {index + 1}</strong>
              <em>{name}</em>
            </span>
          ))}
        </div>
      )}
      {constraintStructure && (
        <div className="atlas-function-preview" aria-label={`${card.title} constraint preview`}>
          <span>
            <strong>Constraint</strong>
            <em>{constraintStructure}</em>
          </span>
        </div>
      )}
      <p>{card.notes || "No notes yet."}</p>
      <footer>
        <span>{card.tags.length} tags</span>
        <span>{card.properties.length} properties</span>
      </footer>
    </article>
  );
}

function getNodePorts(card: AtlasCard) {
  const kind = card.modelObjectKind ?? cardTypeToModelKind(card.type);
  if (kind === "variable" || kind === "parameter" || kind === "constant") {
    return [{ id: "expression", label: "expr out" }];
  }
  if (kind === "atom" || kind === "expression") {
    return [{ id: "expression", label: "expr out" }];
  }
  return [];
}

function getNodeSlots(card: AtlasCard) {
  const kind = card.modelObjectKind ?? cardTypeToModelKind(card.type);
  if (kind === "atom" || kind === "expression") {
    const positionalSlots = card.atomConfig?.positionalInputs.map((input, index) => ({
      id: `arg${index}`,
      label: input.name || `arg ${index + 1}`
    })) ?? [];
    const keywordSlots = Object.values(card.atomConfig?.keywordInputs ?? {})
      .filter((input) => input.kind === "reference")
      .map((input) => ({ id: input.name, label: input.name }));
    return positionalSlots.length > 0 || keywordSlots.length > 0
      ? [...positionalSlots, ...keywordSlots]
      : [
          { id: "arg0", label: "arg 1" },
          { id: "arg1", label: "arg 2" }
        ];
  }
  if (kind === "constraint") {
    return [
      { id: "lhs", label: "LHS" },
      { id: "rhs", label: "RHS" }
    ];
  }
  if (kind === "objective") {
    return [
      { id: "term0", label: card.objective?.direction ?? "term" },
      { id: "term1", label: "term +" }
    ];
  }
  if (kind === "problem") {
    return [
      { id: "objective", label: "objective" },
      { id: "constraints", label: "constraints" }
    ];
  }
  return [];
}

function readPortDrag(event: DragEvent<HTMLElement>): AtlasConnectionEndpoint | null {
  const raw = event.dataTransfer.getData("application/x-atlas-output-port");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AtlasConnectionEndpoint;
    return parsed.nodeId || parsed.objectId ? parsed : null;
  } catch {
    return null;
  }
}

function cardTypeToModelKind(cardType: AtlasCardType) {
  if (cardType === "decision") return "variable";
  if (cardType === "data") return "parameter";
  if (cardType === "object") return "constant";
  if (cardType === "function") return "atom";
  return cardType;
}

function formatPropertyValue(value: AtlasCard["properties"][number]["value"]) {
  if (value === null || value === "") return "empty";
  return String(value);
}

function formatShape(shape: unknown) {
  if (Array.isArray(shape)) return shape.length === 0 ? "scalar" : shape.join("x");
  if (shape === "" || shape === null) return "scalar";
  return String(shape);
}
