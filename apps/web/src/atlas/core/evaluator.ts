import { createConstraintConfig } from "./constraints";
import { evaluateAtlasQuery } from "./queries";
import { createObjectiveConfig } from "./objectives";
import type {
  AtlasCard,
  AtlasConstraintExpression,
  AtlasExpression,
  AtlasWorkbenchState
} from "./types";

export type AtlasEvaluationDiagnostic = {
  level: "warning" | "error";
  message: string;
  cardId?: string;
  propertyName?: string;
};

export type AtlasEvaluationValue =
  | { kind: "number"; value: number }
  | { kind: "constraint"; left: number | null; right: number | null; satisfied: boolean | null };

export type AtlasEvaluationEntry = {
  cardId: string;
  label: string;
  value: AtlasEvaluationValue | null;
  diagnostics: AtlasEvaluationDiagnostic[];
};

export type AtlasEvaluationReport = {
  entries: Record<string, AtlasEvaluationEntry>;
  diagnostics: AtlasEvaluationDiagnostic[];
  mode?: AtlasEvaluationMode;
};

export type AtlasEvaluationMode = "current" | "solution";

export type AtlasEvaluationOptions = {
  mode?: AtlasEvaluationMode;
  runtimeValues?: Record<string, number>;
};

type EvaluationContext = {
  state: AtlasWorkbenchState;
  entries: Record<string, AtlasEvaluationEntry>;
  evaluating: Set<string>;
  runtimeValues: Record<string, number>;
  mode: AtlasEvaluationMode;
};

type NumericResult = {
  value: number | null;
  diagnostics: AtlasEvaluationDiagnostic[];
};

export function evaluateAtlasWorkbench(
  state: AtlasWorkbenchState,
  options: AtlasEvaluationOptions = {}
): AtlasEvaluationReport {
  const context: EvaluationContext = {
    state,
    entries: {},
    evaluating: new Set(),
    runtimeValues: options.runtimeValues ?? {},
    mode: options.mode ?? "current"
  };

  for (const card of state.cards) {
    evaluateAtlasCard(card, context);
  }

  return {
    entries: context.entries,
    diagnostics: Object.values(context.entries).flatMap((entry) => entry.diagnostics),
    mode: context.mode
  };
}

export function evaluateAtlasCard(
  card: AtlasCard,
  contextOrState: EvaluationContext | AtlasWorkbenchState
): AtlasEvaluationEntry {
  const context = isEvaluationContext(contextOrState)
    ? contextOrState
    : {
        state: contextOrState,
        entries: {},
        evaluating: new Set<string>(),
        runtimeValues: {},
        mode: "current" as const
      };
  const cached = context.entries[card.id];
  if (cached) return cached;

  if (context.evaluating.has(card.id)) {
    return makeEntry(card, null, [
      { level: "error", cardId: card.id, message: `Circular evaluation at ${card.title}.` }
    ]);
  }

  context.evaluating.add(card.id);
  const entry =
    card.type === "function"
      ? evaluateFunctionCard(card, context)
      : card.type === "objective"
        ? evaluateObjectiveCard(card, context)
        : card.type === "constraint"
          ? evaluateConstraintCard(card, context)
          : makeEntry(card, null, []);
  context.entries[card.id] = entry;
  context.evaluating.delete(card.id);
  return entry;
}

export function getEvaluationEntry(
  report: AtlasEvaluationReport | null,
  cardId: string | null | undefined
) {
  return cardId && report ? report.entries[cardId] ?? null : null;
}

function evaluateFunctionCard(card: AtlasCard, context: EvaluationContext): AtlasEvaluationEntry {
  if (card.functionKind !== "tagged_sum") return makeEntry(card, null, []);
  const queryId = card.taggedSum?.queryId;
  const expression = card.taggedSum?.expression;
  const query = queryId ? context.state.queries.find((candidate) => candidate.id === queryId) : null;

  if (!query || !expression) {
    return makeEntry(card, null, [
      {
        level: "warning",
        cardId: card.id,
        message: "TaggedSum needs a query and expression before it can evaluate."
      }
    ]);
  }

  const matchedCards = evaluateAtlasQuery(query, context.state.cards);
  const diagnostics: AtlasEvaluationDiagnostic[] = [];
  let total = 0;

  for (const matchedCard of matchedCards) {
    const result = evaluateExpression(expression, matchedCard, context.runtimeValues);
    diagnostics.push(...result.diagnostics);
    if (result.value === null) continue;
    total += result.value;
  }

  return makeEntry(
    card,
    diagnostics.some((diagnostic) => diagnostic.level === "error")
      ? null
      : { kind: "number", value: total },
    diagnostics
  );
}

function evaluateObjectiveCard(card: AtlasCard, context: EvaluationContext): AtlasEvaluationEntry {
  const objective = createObjectiveConfig(card.objective);
  const diagnostics: AtlasEvaluationDiagnostic[] = [];
  let total = 0;

  for (const term of objective.terms) {
    const functionCard = term.functionCardId
      ? context.state.cards.find((candidate) => candidate.id === term.functionCardId)
      : null;
    if (!functionCard) {
      diagnostics.push({
        level: "warning",
        cardId: card.id,
        message: `Objective term "${term.name}" does not reference a Function card.`
      });
      continue;
    }

    const entry = evaluateAtlasCard(functionCard, context);
    diagnostics.push(...entry.diagnostics);
    const value = numericEntryValue(entry);
    if (value === null) {
      diagnostics.push({
        level: "error",
        cardId: card.id,
        message: `Objective term "${term.name}" could not evaluate ${functionCard.title}.`
      });
      continue;
    }
    total += value;
  }

  return makeEntry(
    card,
    diagnostics.some((diagnostic) => diagnostic.level === "error")
      ? null
      : { kind: "number", value: total },
    diagnostics
  );
}

function evaluateConstraintCard(card: AtlasCard, context: EvaluationContext): AtlasEvaluationEntry {
  const constraint = createConstraintConfig(card.constraint);
  const left = evaluateConstraintExpression(constraint.left, card, context);
  const right = evaluateConstraintExpression(constraint.right, card, context);
  const diagnostics = [...left.diagnostics, ...right.diagnostics];
  const satisfied =
    left.value === null || right.value === null
      ? null
      : constraint.operator === "<="
        ? left.value <= right.value
        : constraint.operator === ">="
          ? left.value >= right.value
          : left.value === right.value;

  return makeEntry(
    card,
    {
      kind: "constraint",
      left: left.value,
      right: right.value,
      satisfied
    },
    diagnostics
  );
}

function evaluateConstraintExpression(
  expression: AtlasConstraintExpression,
  owner: AtlasCard,
  context: EvaluationContext
): NumericResult {
  if (expression.kind === "constant") return { value: expression.value, diagnostics: [] };
  const functionCard = expression.functionCardId
    ? context.state.cards.find((card) => card.id === expression.functionCardId)
    : null;
  if (!functionCard) {
    return {
      value: null,
      diagnostics: [
        {
          level: "warning",
          cardId: owner.id,
          message: "Constraint expression does not reference a Function card."
        }
      ]
    };
  }

  const entry = evaluateAtlasCard(functionCard, context);
  return { value: numericEntryValue(entry), diagnostics: entry.diagnostics };
}

export function evaluateExpression(
  expression: AtlasExpression,
  card: AtlasCard,
  runtimeValues: Record<string, number> = {}
): NumericResult {
  switch (expression.kind) {
    case "literal":
      return parseNumericValue(expression.value, {
        level: "error",
        cardId: card.id,
        message: `Literal "${expression.value}" is not numeric.`
      });
    case "property_ref":
      return evaluatePropertyReference(card, expression.propertyName, runtimeValues);
    case "multiply": {
      const left = evaluateExpression(expression.left, card, runtimeValues);
      const right = evaluateExpression(expression.right, card, runtimeValues);
      return {
        value: left.value === null || right.value === null ? null : left.value * right.value,
        diagnostics: [...left.diagnostics, ...right.diagnostics]
      };
    }
    case "add": {
      const results = expression.terms.map((term) => evaluateExpression(term, card, runtimeValues));
      const diagnostics = results.flatMap((result) => result.diagnostics);
      if (results.some((result) => result.value === null)) return { value: null, diagnostics };
      return {
        value: results.reduce((sum, result) => sum + (result.value ?? 0), 0),
        diagnostics
      };
    }
    default:
      return {
        value: null,
        diagnostics: [
          {
            level: "error",
            cardId: card.id,
            message: "Expression kind is not supported by the prototype evaluator."
          }
        ]
      };
  }
}

function evaluatePropertyReference(
  card: AtlasCard,
  propertyName: string,
  runtimeValues: Record<string, number>
): NumericResult {
  const property = card.properties.find((candidate) => candidate.name === propertyName);
  if (!property) {
    return {
      value: null,
      diagnostics: [
        {
          level: "error",
          cardId: card.id,
          propertyName,
          message: `${card.title} is missing property "${propertyName}".`
        }
      ]
    };
  }

  if (property.kind === "decision_ref") {
    const decisionId = typeof property.value === "string" ? property.value : "";
    const runtimeKey = decisionId || `${card.id}.${property.name}`;
    if (typeof runtimeValues[runtimeKey] === "number") {
      return { value: runtimeValues[runtimeKey], diagnostics: [] };
    }
    if (typeof runtimeValues[`${card.id}.${property.name}`] === "number") {
      return { value: runtimeValues[`${card.id}.${property.name}`], diagnostics: [] };
    }
  }

  if (property.kind === "data_ref" && typeof property.value === "object" && property.value !== null) {
    return {
      value: null,
      diagnostics: [
        {
          level: "warning",
          cardId: card.id,
          propertyName,
          message: `${card.title}.${propertyName} references ${property.value.dataCardId}.${property.value.column}; backend evaluation resolves CSV data references.`
        }
      ]
    };
  }

  return parseNumericValue(
    typeof property.value === "object" ? null : property.value,
    {
    level: "error",
    cardId: card.id,
    propertyName,
    message: `${card.title}.${propertyName} does not have a numeric value.`
    }
  );
}

function parseNumericValue(
  value: string | number | boolean | null,
  diagnostic: AtlasEvaluationDiagnostic
): NumericResult {
  if (typeof value === "number" && Number.isFinite(value)) return { value, diagnostics: [] };
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return { value: parsed, diagnostics: [] };
  }
  return { value: null, diagnostics: [diagnostic] };
}

function numericEntryValue(entry: AtlasEvaluationEntry) {
  return entry.value?.kind === "number" ? entry.value.value : null;
}

function makeEntry(
  card: AtlasCard,
  value: AtlasEvaluationValue | null,
  diagnostics: AtlasEvaluationDiagnostic[]
): AtlasEvaluationEntry {
  return {
    cardId: card.id,
    label: card.title,
    value,
    diagnostics
  };
}

function isEvaluationContext(value: EvaluationContext | AtlasWorkbenchState): value is EvaluationContext {
  return "state" in value && "entries" in value;
}
