import type { AtlasCard, AtlasWorkbenchState } from "./types";

export type AtlasSolutionDiagnostic = {
  level?: string;
  message: string;
  sourceId?: string | null;
};

export type AtlasSolutionConstraintResult = {
  left: number | null;
  right: number | null;
  residual: number | null;
  active?: boolean | null;
  satisfied?: boolean | null;
  diagnostics?: AtlasSolutionDiagnostic[];
};

export type AtlasSolveResult = {
  status: string;
  objectiveValue: number | null;
  variableValues: Record<string, number | null>;
  constraints?: Record<string, AtlasSolutionConstraintResult>;
  diagnostics: AtlasSolutionDiagnostic[];
  code?: string | null;
};

export type AtlasSolutionState =
  | { status: "empty" }
  | { status: "loading"; previous?: AtlasSolveResult | null; stale?: boolean }
  | { status: "success"; result: AtlasSolveResult; stale: boolean }
  | { status: "error"; message: string; previous?: AtlasSolveResult | null; stale?: boolean };

export function parseAtlasSolveResult(value: unknown): AtlasSolveResult {
  const record = isRecord(value) ? value : {};
  return {
    status: typeof record.status === "string" ? record.status : "unknown",
    objectiveValue: readNullableNumber(record.objectiveValue),
    variableValues: readNumberMap(record.variableValues),
    constraints: readConstraintMap(record.constraints),
    diagnostics: readDiagnostics(record.diagnostics),
    code: typeof record.code === "string" ? record.code : null
  };
}

export function resolveSolutionVariableTarget(
  variableId: string,
  cards: AtlasCard[]
): { cardId: string | null; propertyName?: string } {
  if (cards.some((card) => card.id === variableId)) return { cardId: variableId };

  for (const card of cards) {
    const property = card.properties.find(
      (candidate) =>
        candidate.kind === "decision_ref" &&
        (candidate.value === variableId || `${card.id}.${candidate.name}` === variableId)
    );
    if (property) return { cardId: card.id, propertyName: property.name };
  }

  const separatorIndex = variableId.lastIndexOf(".");
  if (separatorIndex > 0) {
    const cardId = variableId.slice(0, separatorIndex);
    if (cards.some((card) => card.id === cardId)) {
      return { cardId, propertyName: variableId.slice(separatorIndex + 1) };
    }
  }

  return { cardId: null };
}

export function isSolutionStale(solution: AtlasSolutionState) {
  return (
    (solution.status === "success" && solution.stale) ||
    (solution.status === "loading" && Boolean(solution.stale)) ||
    (solution.status === "error" && Boolean(solution.stale))
  );
}

function readNullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberMap(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, readNullableNumber(entry)])
  );
}

function readConstraintMap(value: unknown) {
  if (!isRecord(value)) return undefined;
  const constraints: Record<string, AtlasSolutionConstraintResult> = {};
  for (const [id, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    constraints[id] = {
      left: readNullableNumber(entry.left),
      right: readNullableNumber(entry.right),
      residual: readNullableNumber(entry.residual),
      active: typeof entry.active === "boolean" ? entry.active : null,
      satisfied: typeof entry.satisfied === "boolean" ? entry.satisfied : null,
      diagnostics: readDiagnostics(entry.diagnostics)
    };
  }
  return constraints;
}

function readDiagnostics(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((diagnostic) =>
    isRecord(diagnostic)
      ? {
          level: typeof diagnostic.level === "string" ? diagnostic.level : undefined,
          message: typeof diagnostic.message === "string" ? diagnostic.message : String(diagnostic),
          sourceId: typeof diagnostic.sourceId === "string" ? diagnostic.sourceId : null
        }
      : { message: String(diagnostic) }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function solutionRuntimeValues(solution: AtlasSolutionState): Record<string, number> {
  if (solution.status !== "success" && solution.status !== "loading" && solution.status !== "error") {
    return {};
  }
  const result = solution.status === "success" ? solution.result : solution.previous;
  if (!result) return {};
  return Object.fromEntries(
    Object.entries(result.variableValues).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number"
    )
  );
}

export function hasModelContent(state: AtlasWorkbenchState) {
  return state.cards.length > 0 || state.queries.length > 0 || state.groups.length > 0;
}
