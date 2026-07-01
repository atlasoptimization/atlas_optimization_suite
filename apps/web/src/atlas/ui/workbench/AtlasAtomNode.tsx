import type { AtlasCvxpyObjectMetadata } from "../../api/backendClient";
import type { AtlasAtomConfig } from "../../core/types";

type AtlasAtomNodeProps = {
  atomConfig: AtlasAtomConfig;
  metadata?: AtlasCvxpyObjectMetadata;
  preview?: string;
};

export function AtlasAtomNode({ atomConfig, metadata, preview }: AtlasAtomNodeProps) {
  const keywordInputs = Object.values(atomConfig.keywordInputs);
  const hint = atomConfig.uiOverrides?.description ?? atomConfig.metadata?.description;
  const argumentSpecs = getArgumentSpecs(atomConfig);
  const variadicArgument = argumentSpecs.find((argument) =>
    argument.ui?.widget === "variadic_expression_list" ||
    getArgumentUiHint(atomConfig, argument.name)?.widget === "variadic_expression_list"
  );
  return (
    <section className="atlas-atom-node" aria-label={`${atomConfig.displayName} atom node`}>
      <header>
        <strong>{atomConfig.displayName}</strong>
        <span>{atomConfig.signature}</span>
      </header>
      <div className="atlas-atom-output-port" aria-label="Atom output port">
        <span>Output</span>
        <em>{preview ?? atomConfig.outputName ?? atomConfig.displayName}</em>
      </div>
      <div className="atlas-atom-node-grid">
        <div>
          <span>Input slots</span>
          {[...atomConfig.positionalInputs, ...keywordInputs].length === 0 ? (
            <em>No configured inputs</em>
          ) : (
            [...atomConfig.positionalInputs, ...keywordInputs].map((input) => (
              <em key={input.id} className="atlas-atom-input-slot">
                {input.name}: {input.kind === "literal" ? formatLiteral(input.value) : "reference"}
              </em>
            ))
          )}
          {variadicArgument && (
            <button type="button" className="atlas-atom-add-input" disabled title="Repeatable input wiring is represented by the catalog; dynamic slot editing comes next.">
              + add {variadicArgument.name}
            </button>
          )}
        </div>
        <div>
          <span>Symbol</span>
          <em>{atomConfig.symbolId ?? atomConfig.importPath}</em>
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

function getArgumentSpecs(atomConfig: AtlasAtomConfig) {
  const metadataArguments = atomConfig.metadata?.arguments;
  if (Array.isArray(metadataArguments)) {
    return metadataArguments
      .filter((argument): argument is { name: string; ui?: { widget?: string } } =>
        typeof argument === "object" && argument !== null && "name" in argument && typeof argument.name === "string"
      );
  }
  const overrideArguments = atomConfig.uiOverrides?.arguments;
  if (Array.isArray(overrideArguments)) {
    return overrideArguments
      .filter((argument): argument is { name: string; ui?: { widget?: string } } =>
        typeof argument === "object" && argument !== null && "name" in argument && typeof argument.name === "string"
      );
  }
  return [];
}

function getArgumentUiHint(atomConfig: AtlasAtomConfig, argumentName: string) {
  const metadataUi = atomConfig.metadata?.ui;
  const overrideUi = atomConfig.uiOverrides?.ui;
  const candidate = isRecord(metadataUi) ? metadataUi : isRecord(overrideUi) ? overrideUi : undefined;
  const argumentUiHints = isRecord(candidate?.argumentUiHints) ? candidate.argumentUiHints : undefined;
  const hint = argumentUiHints?.[argumentName];
  return isRecord(hint) ? hint : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatLiteral(value: unknown) {
  if (value === null || value === undefined || value === "") return "empty";
  return String(value);
}

function formatShape(shape: unknown) {
  if (Array.isArray(shape)) return shape.length === 0 ? "scalar" : shape.join("x");
  return String(shape);
}
