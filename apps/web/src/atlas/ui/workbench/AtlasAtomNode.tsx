import type { AtlasCvxpyObjectMetadata } from "../../api/backendClient";
import type { AtlasAtomConfig } from "../../core/types";

type AtlasAtomNodeProps = {
  atomConfig: AtlasAtomConfig;
  metadata?: AtlasCvxpyObjectMetadata;
};

export function AtlasAtomNode({ atomConfig, metadata }: AtlasAtomNodeProps) {
  const keywordInputs = Object.values(atomConfig.keywordInputs);
  const hint = atomConfig.uiOverrides?.description ?? atomConfig.metadata?.description;
  return (
    <section className="atlas-atom-node" aria-label={`${atomConfig.displayName} atom node`}>
      <header>
        <strong>{atomConfig.displayName}</strong>
        <span>{atomConfig.signature}</span>
      </header>
      <div className="atlas-atom-node-grid">
        <div>
          <span>Inputs</span>
          {[...atomConfig.positionalInputs, ...keywordInputs].length === 0 ? (
            <em>No configured inputs</em>
          ) : (
            [...atomConfig.positionalInputs, ...keywordInputs].map((input) => (
              <em key={input.id}>
                {input.name}: {input.kind === "literal" ? formatLiteral(input.value) : "reference"}
              </em>
            ))
          )}
        </div>
        <div>
          <span>Output</span>
          <em>{atomConfig.outputName ?? "expression"}</em>
        </div>
      </div>
      {typeof hint === "string" && <em>{hint}</em>}
      {metadata && (
        <div className="atlas-atom-node-metadata">
          {metadata.shape !== undefined && <span>{formatShape(metadata.shape)}</span>}
          {metadata.curvature && <span>{metadata.curvature}</span>}
          {metadata.is_dcp !== undefined && metadata.is_dcp !== null && (
            <span>{metadata.is_dcp ? "DCP" : "non-DCP"}</span>
          )}
        </div>
      )}
    </section>
  );
}

function formatLiteral(value: unknown) {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function formatShape(shape: unknown) {
  if (Array.isArray(shape)) return shape.length === 0 ? "scalar" : shape.join("x");
  return String(shape);
}
