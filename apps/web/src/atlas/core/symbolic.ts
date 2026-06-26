import { createConstraintConfig } from "./constraints";
import { expressionPreview } from "./expressions";
import { getFunctionDependencySummary } from "./functions";
import { createObjectiveConfig } from "./objectives";
import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasConstraintExpression,
  AtlasExpression,
  AtlasTagCondition,
  AtlasWorkbenchState
} from "./types";

export type AtlasSymbolicPreview = {
  expression: string;
  details: string[];
};

export function renderCardSymbolicPreview(
  card: AtlasCard,
  state: AtlasWorkbenchState
): AtlasSymbolicPreview | null {
  if (card.type === "function") return renderTaggedSumSymbol(card, state);
  if (card.type === "objective") return renderObjectiveSymbol(card, state);
  if (card.type === "constraint") return renderConstraintSymbol(card, state);
  return null;
}

export function renderTaggedSumSymbol(
  card: AtlasCard,
  state: AtlasWorkbenchState
): AtlasSymbolicPreview {
  const query = card.taggedSum?.queryId
    ? state.queries.find((candidate) => candidate.id === card.taggedSum?.queryId)
    : null;
  const expression = card.taggedSum?.expression
    ? renderExpressionSymbol(card.taggedSum.expression, state)
    : "expression";
  const queryText = query ? renderQuerySymbol(query) : "no query";
  const dependencySummary = getFunctionDependencySummary(card, state.queries, state.cards);

  return {
    expression: `Σ(${expression} | ${queryText})`,
    details: dependencySummary.matchedCards.map((matchedCard) => matchedCard.title)
  };
}

export function renderObjectiveSymbol(
  card: AtlasCard,
  state: AtlasWorkbenchState
): AtlasSymbolicPreview {
  const objective = createObjectiveConfig(card.objective);
  const terms = objective.terms.map((term) => {
    const functionCard = term.functionCardId
      ? state.cards.find((candidate) => candidate.id === term.functionCardId)
      : null;
    return functionCard ? renderTaggedSumSymbol(functionCard, state).expression : term.name;
  });

  return {
    expression: `${objective.direction === "minimize" ? "min" : "max"} ${
      terms.join(" + ") || "0"
    }`,
    details: objective.terms.map((term) => term.name)
  };
}

export function renderConstraintSymbol(
  card: AtlasCard,
  state: AtlasWorkbenchState
): AtlasSymbolicPreview {
  const constraint = createConstraintConfig(card.constraint);
  return {
    expression: `${renderConstraintExpressionSymbol(
      constraint.left,
      state
    )} ${constraint.operator} ${renderConstraintExpressionSymbol(constraint.right, state)}`,
    details: [constraint.name]
  };
}

export function renderExpressionSymbol(
  expression: AtlasExpression,
  state?: AtlasWorkbenchState
): string {
  switch (expression.kind) {
    case "literal":
      return String(expression.value);
    case "property_ref":
      return renderPropertyReferenceSymbol(expression.propertyName || "property", state);
    case "multiply":
      return `${renderExpressionSymbol(expression.left, state)} × ${renderExpressionSymbol(expression.right, state)}`;
    case "add":
      return expression.terms.map((term) => renderExpressionSymbol(term, state)).join(" + ");
    default:
      return expressionPreview(expression);
  }
}

function renderPropertyReferenceSymbol(propertyName: string, state?: AtlasWorkbenchState) {
  if (!state) return propertyName;
  const indexed = state.cards
    .flatMap((card) => card.properties)
    .find((property) => property.name === propertyName && property.indexSetId);
  if (!indexed?.indexSetId) return propertyName;
  const indexCard = state.cards.find((card) => card.id === indexed.indexSetId);
  const indexName = indexCard?.data?.indexSet?.name ?? indexed.indexSetId;
  return `${propertyName}[${indexName}]`;
}

function renderConstraintExpressionSymbol(
  expression: AtlasConstraintExpression,
  state: AtlasWorkbenchState
) {
  if (expression.kind === "constant") return String(expression.value);
  const functionCard = expression.functionCardId
    ? state.cards.find((card) => card.id === expression.functionCardId)
    : null;
  return functionCard ? renderTaggedSumSymbol(functionCard, state).expression : "Function";
}

function renderQuerySymbol(query: AtlasCardQuery) {
  const include = query.includeTags.map(renderCondition);
  const exclude = query.excludeTags.map((condition) => `not ${renderCondition(condition)}`);
  return [...include, ...exclude].join(", ") || query.name;
}

function renderCondition(condition: AtlasTagCondition) {
  return `${condition.key}=${condition.value}`;
}
