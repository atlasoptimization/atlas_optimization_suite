import { useMemo, useState } from "react";
import { filterAtomSpecs, type AtlasAtomSpec } from "../../core/atoms";
import { getCanonicalModelObjects } from "../../core/cards";
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
    shape?: "scalar" | "vector" | "matrix",
    atomSpec?: AtlasAtomSpec
  ) => void;
  onCreateWorkspaceReference: (modelObjectId: string) => void;
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
  onCreateWorkspaceReference
}: AtlasConstructorPanelProps) {
  const [variableName, setVariableName] = useState("x");
  const [parameterName, setParameterName] = useState("p");
  const [atomQuery, setAtomQuery] = useState("");
  const starterTemplates = templates.filter((template) => STARTER_TEMPLATE_IDS.has(template.id));
  const filteredAtoms = useMemo(() => filterAtomSpecs(atomSpecs, atomQuery).slice(0, 48), [atomSpecs, atomQuery]);
  const atomGroups = useMemo(() => groupAtoms(filteredAtoms), [filteredAtoms]);
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

  return (
    <aside className="atlas-constructor-panel" aria-label="Constructor">
      <section className="atlas-constructor-stack" aria-label="Constructor">
        <header>
          <p className="atlas-eyebrow">Constructor</p>
          <h2>Define objects</h2>
        </header>

        <section className="atlas-constructor-section" aria-label="Variable constructor">
          <h3>Variables</h3>
          <label className="atlas-constructor-field">
            <span>Name</span>
            <input value={variableName} onChange={(event) => setVariableName(event.currentTarget.value)} />
          </label>
          <div className="atlas-constructor-grid">
            <button type="button" onClick={() => onDefineModelObject("variable", variableName, "scalar")}>
              <span>Scalar variable</span>
              <em>Define canonical variable</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("variable", variableName, "vector")}>
              <span>Vector variable</span>
              <em>Shape metadata later</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("variable", variableName, "matrix")}>
              <span>Matrix variable</span>
              <em>Shape metadata later</em>
            </button>
          </div>
        </section>

        <section className="atlas-constructor-section" aria-label="Parameter constructor">
          <h3>Parameters</h3>
          <label className="atlas-constructor-field">
            <span>Name</span>
            <input value={parameterName} onChange={(event) => setParameterName(event.currentTarget.value)} />
          </label>
          <div className="atlas-constructor-grid">
            <button type="button" onClick={() => onDefineModelObject("parameter", parameterName, "scalar")}>
              <span>Scalar parameter</span>
              <em>Define canonical parameter</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("parameter", parameterName, "vector")}>
              <span>Vector parameter</span>
              <em>Shape metadata later</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("parameter", parameterName, "matrix")}>
              <span>Matrix parameter</span>
              <em>Shape metadata later</em>
            </button>
          </div>
        </section>

        <section className="atlas-constructor-section" aria-label="Other constructors">
          <h3>Constants and Problems</h3>
          <div className="atlas-constructor-grid">
            <button type="button" onClick={() => onDefineModelObject("constant", "c")}>
              <span>Constant</span>
              <em>Define reusable value</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("constraint", "constraint")}>
              <span>Constraint</span>
              <em>Define relation</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("objective", "objective")}>
              <span>Objective</span>
              <em>Define target</em>
            </button>
            <button type="button" onClick={() => onDefineModelObject("problem", "problem")}>
              <span>Problem</span>
              <em>Define CVXPY problem</em>
            </button>
          </div>
        </section>

        <section className="atlas-constructor-section" aria-label="CVXPY atom palette">
          <h3>Atoms</h3>
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
            {atomGroups.map(([category, atoms]) => (
              <section key={category} className="atlas-atom-group">
                <h4>{category}</h4>
                {atoms.map((atomSpec) => (
                  <button
                    key={atomSpec.importPath}
                    type="button"
                    draggable
                    onClick={() => onDefineModelObject("atom", atomSpec.name, "scalar", atomSpec)}
                    onDragStart={(event) => {
                      event.dataTransfer.setData("application/x-atlas-atom-spec", JSON.stringify(atomSpec));
                      event.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <strong>{atomSpec.name}</strong>
                    <span>{atomSpec.signature}</span>
                  </button>
                ))}
              </section>
            ))}
          </div>
        </section>
      </section>

      <section className="atlas-constructor-stack" aria-label="Explorer">
        <header>
          <p className="atlas-eyebrow">Explorer</p>
          <h2>Model definitions</h2>
        </header>
        <ExplorerSection title="Variables" objects={canonicalObjects.filter((card) => card.modelObjectKind === "variable")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Parameters" objects={canonicalObjects.filter((card) => card.modelObjectKind === "parameter")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Constants" objects={canonicalObjects.filter((card) => card.modelObjectKind === "constant")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Expressions / Atoms" objects={canonicalObjects.filter((card) => card.modelObjectKind === "atom" || card.modelObjectKind === "expression")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Constraints" objects={canonicalObjects.filter((card) => card.modelObjectKind === "constraint")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Objectives" objects={canonicalObjects.filter((card) => card.modelObjectKind === "objective")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
        <ExplorerSection title="Problems" objects={canonicalObjects.filter((card) => card.modelObjectKind === "problem")} onCreateWorkspaceReference={onCreateWorkspaceReference} />
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

function ExplorerSection({
  title,
  objects,
  onCreateWorkspaceReference
}: {
  title: string;
  objects: AtlasCard[];
  onCreateWorkspaceReference: (modelObjectId: string) => void;
}) {
  return (
    <section className="atlas-constructor-section atlas-explorer-section" aria-label={`${title} explorer`}>
      <h3>{title}</h3>
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
              >
                <strong>{object.title}</strong>
                <span>{object.modelObjectId ?? object.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
