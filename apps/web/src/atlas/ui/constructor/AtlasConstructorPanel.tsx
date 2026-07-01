import { useMemo, useState, type MouseEvent } from "react";
import { filterAtomSpecs, type AtlasAtomSpec } from "../../core/atoms";
import { getCanonicalModelObjects } from "../../core/cards";
import { symbolToAtomSpec, type GeneratedSymbolSpec } from "../../core/generatedSymbols";
import {
  CVXPY_VARIABLE_ATTRIBUTES,
  atlasShapeLabel,
  compactValuePreview,
  parseAtlasShapeDraft,
  type AtlasShapeMode
} from "../../core/modelDefinitions";
import { searchSymbols } from "../../core/symbolCatalog";
import type { AtlasCard, AtlasCardModuleKind, AtlasCardType } from "../../core/types";
import type { AtlasCardTemplate } from "../../core/templates";

const STARTER_TEMPLATE_IDS = new Set([
  "generic-object",
  "generic-decision",
  "generic-data-source",
  "generic-constraint",
  "generic-objective"
]);

const MODULE_KINDS: AtlasCardModuleKind[] = ["tag", "property", "diagnostic", "note"];

type AtlasConstructorPanelProps = {
  cards: AtlasCard[];
  templates: AtlasCardTemplate[];
  atomSpecs: AtlasAtomSpec[];
  atomRegistryStatus: string;
  onCreateCard: (cardType: AtlasCardType) => void;
  onCreateFromTemplate: (templateId: string) => void;
  onCreateGroup: () => void;
  onDefineModelObject: (
    objectKind: "variable" | "parameter" | "constant" | "atom" | "constraint" | "objective" | "problem",
    name: string,
    shape?: unknown,
    atomSpec?: AtlasAtomSpec,
    options?: { attributes?: Record<string, boolean>; value?: unknown; notes?: string }
  ) => void;
  onCreateWorkspaceReference: (modelObjectId: string) => void;
  onExplorerContextMenu?: (event: MouseEvent<HTMLElement>, modelObjectId: string) => void;
};

export function AtlasConstructorPanel({
  cards,
  templates,
  atomSpecs,
  atomRegistryStatus,
  onCreateCard,
  onCreateFromTemplate,
  onCreateGroup,
  onDefineModelObject,
  onCreateWorkspaceReference,
  onExplorerContextMenu
}: AtlasConstructorPanelProps) {
  const [defineName, setDefineName] = useState("x");
  const [defineKind, setDefineKind] = useState<"variable" | "parameter" | "constant" | "atom" | "constraint" | "objective" | "problem">("variable");
  const [defineShapeMode, setDefineShapeMode] = useState<AtlasShapeMode>("scalar");
  const [vectorLength, setVectorLength] = useState("20");
  const [matrixRows, setMatrixRows] = useState("3");
  const [matrixCols, setMatrixCols] = useState("2");
  const [customShape, setCustomShape] = useState("(20,)");
  const [defineValue, setDefineValue] = useState("");
  const [variableAttributes, setVariableAttributes] = useState<Record<string, boolean>>({});
  const [defineSnippet, setDefineSnippet] = useState("");
  const [atomQuery, setAtomQuery] = useState("");
  const starterTemplates = templates.filter((template) => STARTER_TEMPLATE_IDS.has(template.id));
  const filteredSymbols = useMemo(() => sortSymbolsForPalette(searchSymbols(atomQuery)).slice(0, 80), [atomQuery]);
  const fallbackFilteredAtoms = useMemo(() => filterAtomSpecs(atomSpecs, atomQuery).slice(0, 48), [atomSpecs, atomQuery]);
  const symbolGroups = useMemo(() => groupSymbols(filteredSymbols), [filteredSymbols]);
  const canonicalObjects = useMemo(
    () =>
      getCanonicalModelObjects({
        cards,
        groups: [],
        queries: [],
        connections: [],
        selectedCardId: null,
        selectedGroupId: null,
        selectedQueryId: null
      }),
    [cards]
  );
  const parsedShape = parseAtlasShapeDraft({
    mode: defineShapeMode,
    vectorLength,
    matrixRows,
    matrixCols,
    customShape
  });

  function submitDefinition() {
    if ((defineKind === "variable" || defineKind === "parameter") && !parsedShape.ok) return;
    onDefineModelObject(
      defineKind,
      defineName,
      parsedShape.ok ? parsedShape.shape : "scalar",
      undefined,
      {
        attributes: variableAttributes,
        value: parseDefinitionValue(defineValue),
        notes: parsedShape.ok ? `${parsedShape.label} ${defineKind}` : undefined
      }
    );
  }

  return (
    <aside className="atlas-constructor-panel" aria-label="Constructor">
      <section className="atlas-constructor-stack" aria-label="Constructor">
        <header>
          <p className="atlas-eyebrow">Constructor</p>
          <h2>Define</h2>
        </header>

        <details className="atlas-define-menu">
          <summary>Define...</summary>
          <div className="atlas-define-dialog" role="dialog" aria-label="Define model object">
            <label className="atlas-constructor-field">
              <span>Object kind</span>
              <select value={defineKind} onChange={(event) => setDefineKind(event.currentTarget.value as typeof defineKind)}>
                <option value="variable">Variable</option>
                <option value="parameter">Parameter</option>
                <option value="constant">Constant</option>
                <option value="atom">Atom / Expression</option>
                <option value="constraint">Constraint</option>
                <option value="objective">Objective</option>
                <option value="problem">Problem</option>
              </select>
            </label>
            <label className="atlas-constructor-field">
              <span>Name</span>
              <input value={defineName} onChange={(event) => setDefineName(event.currentTarget.value)} />
            </label>
            {(defineKind === "variable" || defineKind === "parameter") && (
              <>
                <label className="atlas-constructor-field">
                  <span>Shape</span>
                  <select value={defineShapeMode} onChange={(event) => setDefineShapeMode(event.currentTarget.value as AtlasShapeMode)}>
                    <option value="scalar">Scalar</option>
                    <option value="vector">Vector</option>
                    <option value="matrix">Matrix</option>
                    <option value="custom">Custom tuple</option>
                  </select>
                </label>
                {defineShapeMode === "vector" && (
                  <label className="atlas-constructor-field">
                    <span>Vector length n</span>
                    <input value={vectorLength} onChange={(event) => setVectorLength(event.currentTarget.value)} inputMode="numeric" />
                  </label>
                )}
                {defineShapeMode === "matrix" && (
                  <div className="atlas-constructor-row">
                    <label className="atlas-constructor-field">
                      <span>Rows m</span>
                      <input value={matrixRows} onChange={(event) => setMatrixRows(event.currentTarget.value)} inputMode="numeric" />
                    </label>
                    <label className="atlas-constructor-field">
                      <span>Cols n</span>
                      <input value={matrixCols} onChange={(event) => setMatrixCols(event.currentTarget.value)} inputMode="numeric" />
                    </label>
                  </div>
                )}
                {defineShapeMode === "custom" && (
                  <label className="atlas-constructor-field">
                    <span>Custom shape</span>
                    <input value={customShape} onChange={(event) => setCustomShape(event.currentTarget.value)} placeholder="(3, 2)" />
                  </label>
                )}
                {!parsedShape.ok && <p className="atlas-form-error">{parsedShape.error}</p>}
              </>
            )}
            {defineKind === "variable" && (
              <fieldset className="atlas-attribute-grid">
                <legend>CVXPY attributes</legend>
                {CVXPY_VARIABLE_ATTRIBUTES.map((attribute) => (
                  <label key={attribute}>
                    <input
                      type="checkbox"
                      checked={Boolean(variableAttributes[attribute])}
                      onChange={(event) =>
                        setVariableAttributes((current) => ({
                          ...current,
                          [attribute]: event.currentTarget.checked
                        }))
                      }
                    />
                    <span>{attribute}</span>
                  </label>
                ))}
              </fieldset>
            )}
            {(defineKind === "parameter" || defineKind === "constant") && (
              <label className="atlas-constructor-field">
                <span>Value</span>
                <textarea
                  value={defineValue}
                  onChange={(event) => setDefineValue(event.currentTarget.value)}
                  placeholder='Scalar, JSON vector, or matrix, e.g. 3.5 or [[1, 0], [1, 1]]'
                  rows={3}
                />
              </label>
            )}
            <label className="atlas-constructor-field">
              <span>Command / JSON snippet</span>
              <textarea
                value={defineSnippet}
                onChange={(event) => setDefineSnippet(event.currentTarget.value)}
                placeholder='Limited for now: use fields above. Future: {"kind":"variable","name":"x","shape":[2]}'
                rows={3}
              />
            </label>
            {defineSnippet.trim() && (
              <p className="atlas-muted">Command parsing is not broadly implemented yet; the fields above define the object.</p>
            )}
            <button
              className="atlas-constructor-wide-action"
              type="button"
              disabled={!parsedShape.ok}
              onClick={submitDefinition}
            >
              Define {defineKind}
            </button>
          </div>
        </details>

        <details className="atlas-constructor-section atlas-atom-disclosure" aria-label="CVXPY atom palette">
          <summary>Add Atom...</summary>
          <p className="atlas-muted">{atomRegistryStatus}</p>
          <label className="atlas-constructor-field">
            <span>Search atoms</span>
            <input
              value={atomQuery}
              placeholder="sum, norm, square..."
              onChange={(event) => setAtomQuery(event.currentTarget.value)}
            />
          </label>
          <div className="atlas-atom-palette">
            {symbolGroups.length > 0 ? symbolGroups.map(([category, symbols]) => (
              <section key={category} className="atlas-atom-group">
                <h4>{category}</h4>
                {symbols.map((symbol) => {
                  const atomSpec = symbolToAtomSpec(symbol);
                  return (
                  <button
                    key={symbol.id}
                    type="button"
                    draggable
                    onClick={() => onDefineModelObject("atom", atomSpec.displayName ?? atomSpec.name, "scalar", atomSpec)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-atlas-atom-spec", JSON.stringify(atomSpec));
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <strong>{atomSpec.displayName ?? atomSpec.name}</strong>
                    <span>{symbol.kind} · {atomSpec.signature}</span>
                  </button>
                  );
                })}
              </section>
            )) : groupAtoms(fallbackFilteredAtoms).map(([category, atoms]) => (
              <section key={category} className="atlas-atom-group">
                <h4>{category}</h4>
                {atoms.map((atomSpec) => (
                  <button
                    key={atomSpec.importPath}
                    type="button"
                    draggable
                    onClick={() => onDefineModelObject("atom", atomSpec.displayName ?? atomSpec.name, "scalar", atomSpec)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-atlas-atom-spec", JSON.stringify(atomSpec));
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <strong>{atomSpec.displayName ?? atomSpec.name}</strong>
                    <span>{atomSpec.signature}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </details>
      </section>

      <section className="atlas-constructor-stack" aria-label="Explorer">
        <header>
          <p className="atlas-eyebrow">Explorer</p>
          <h2>Model definitions</h2>
        </header>
        <ExplorerSection title="Variables" defaultOpen objects={canonicalObjects.filter((card) => card.modelObjectKind === "variable")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Parameters" defaultOpen objects={canonicalObjects.filter((card) => card.modelObjectKind === "parameter")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Constants" objects={canonicalObjects.filter((card) => card.modelObjectKind === "constant")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Expressions / Atoms" objects={canonicalObjects.filter((card) => card.modelObjectKind === "atom" || card.modelObjectKind === "expression")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Constraints" objects={canonicalObjects.filter((card) => card.modelObjectKind === "constraint")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Objectives" objects={canonicalObjects.filter((card) => card.modelObjectKind === "objective")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
        <ExplorerSection title="Problems" objects={canonicalObjects.filter((card) => card.modelObjectKind === "problem")} onCreateWorkspaceReference={onCreateWorkspaceReference} onExplorerContextMenu={onExplorerContextMenu} />
      </section>

      <section className="atlas-constructor-section" aria-label="Workbench layout">
        <h3>Layout</h3>
        <button className="atlas-constructor-wide-action" type="button" onClick={onCreateGroup}>
          Add visual group
        </button>
      </section>

      <section className="atlas-constructor-section" aria-label="Module palette">
        <h3>Modules</h3>
        <div className="atlas-module-palette">
          {MODULE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-atlas-module-kind", kind);
                event.dataTransfer.effectAllowed = "copy";
              }}
            >
              + {kind}
            </button>
          ))}
        </div>
      </section>

      <section className="atlas-constructor-section" aria-label="Legacy card compatibility">
        <h3>Compatibility</h3>
        <div className="atlas-template-list">
          {starterTemplates.map((template) => (
            <button key={template.id} type="button" onClick={() => onCreateFromTemplate(template.id)}>
              <strong>{template.name}</strong>
              <span>{template.description}</span>
            </button>
          ))}
        </div>
        <button className="atlas-constructor-wide-action" type="button" onClick={() => onCreateCard("function")}>
          Add legacy expression card
        </button>
      </section>
    </aside>
  );
}

function groupAtoms(atoms: AtlasAtomSpec[]) {
  const grouped = atoms.reduce<Record<string, AtlasAtomSpec[]>>((current, atomSpec) => {
    const category = atomSpec.category || atomSpec.module || "atoms";
    current[category] = [...(current[category] ?? []), atomSpec];
    return current;
  }, {});
  return Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right));
}

function groupSymbols(symbols: GeneratedSymbolSpec[]) {
  const grouped = symbols.reduce<Record<string, GeneratedSymbolSpec[]>>((current, symbol) => {
    const category = symbol.category || symbol.module || symbol.kind || "symbols";
    current[category] = [...(current[category] ?? []), symbol];
    return current;
  }, {});
  return Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right));
}

const PALETTE_PRIORITY_NAMES = new Set([
  "norm",
  "sum",
  "sum_squares",
  "square",
  "abs",
  "hstack",
  "vstack",
  "reshape",
  "add",
  "subtract",
  "multiply",
  "matmul"
]);

function sortSymbolsForPalette(symbols: GeneratedSymbolSpec[]) {
  return [...symbols].sort((left, right) => {
    const leftPriority = PALETTE_PRIORITY_NAMES.has(left.name) ? 0 : 1;
    const rightPriority = PALETTE_PRIORITY_NAMES.has(right.name) ? 0 : 1;
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
    return left.name.localeCompare(right.name);
  });
}

function ExplorerSection({
  title,
  defaultOpen = false,
  objects,
  onCreateWorkspaceReference,
  onExplorerContextMenu
}: {
  title: string;
  defaultOpen?: boolean;
  objects: AtlasCard[];
  onCreateWorkspaceReference: (modelObjectId: string) => void;
  onExplorerContextMenu?: (event: MouseEvent<HTMLElement>, modelObjectId: string) => void;
}) {
  return (
    <details className="atlas-constructor-section atlas-explorer-section" aria-label={`${title} explorer`} open={defaultOpen}>
      <summary>
        <span>{title}</span>
        <small>{objects.length}</small>
      </summary>
      {objects.length === 0 ? (
        <p className="atlas-muted">No definitions.</p>
      ) : (
        <ul className="atlas-explorer-list">
          {objects.map((object) => (
            <li key={object.modelObjectId ?? object.id}>
              <button
                type="button"
                draggable
                onDragStart={(event) => {
                  event.dataTransfer.setData("application/x-atlas-model-object", object.modelObjectId ?? object.id);
                  event.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onCreateWorkspaceReference(object.modelObjectId ?? object.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onExplorerContextMenu?.(event, object.modelObjectId ?? object.id);
                }}
              >
                <span className="atlas-explorer-cell atlas-explorer-name">{object.title}</span>
                <span className="atlas-explorer-cell">{kindLabel(object)}</span>
                <span className="atlas-explorer-cell">{shapeLabel(object)}</span>
                <span className="atlas-explorer-cell">{compactValuePreview(object.modelObjectValue)}</span>
                <span className="atlas-explorer-badge">{statusLabel(object)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

function shapeLabel(object: AtlasCard) {
  return atlasShapeLabel(object.modelObjectShape ?? object.decision?.shape);
}

function kindLabel(object: AtlasCard) {
  const kind = object.modelObjectKind ?? object.type;
  if (kind === "atom") return object.atomSpec?.name ? `Atom ${object.atomSpec.name}` : "Atom";
  if (kind === "variable") return object.decision?.variableType === "continuous" ? "Variable" : `Variable ${object.decision?.variableType}`;
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

function statusLabel(object: AtlasCard) {
  if (object.decision?.attributes?.boolean) return "boolean";
  if (object.decision?.attributes?.integer) return "integer";
  if (object.modelObjectKind === "variable") return "affine";
  return "defined";
}

function parseDefinitionValue(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : trimmed;
  }
}
