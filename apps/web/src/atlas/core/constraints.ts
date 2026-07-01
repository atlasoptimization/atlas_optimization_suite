import { getFunctionDependencySummary } from "./functions";
import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasConstraintConfig,
  AtlasConstraintExpression,
  AtlasConstraintOperator,
  AtlasWorkbenchState
} from "./types";

export function createConstraintConfig(
  options: Partial<AtlasConstraintConfig> = {}
): AtlasConstraintConfig {
  return {
    name: options.name?.trim() || "Constraint",
    left: normalizeConstraintExpression(options.left),
    operator: options.operator ?? "<=",
    right: normalizeConstraintExpression(options.right, 0)
  };
}

export function createFunctionConstraintExpression(
  functionCardId: string | null
): AtlasConstraintExpression {
  return { kind: "function_ref", functionCardId };
}

export function createConstantConstraintExpression(value: number): AtlasConstraintExpression {
  return { kind: "constant", value: Number.isFinite(value) ? value : 0 };
}

export function updateConstraintConfig(
  state: AtlasWorkbenchState,
  cardId: string,
  patch: Partial<AtlasConstraintConfig>
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId && card.type === "constraint"
        ? { ...card, constraint: createConstraintConfig({ ...card.constraint, ...patch }) }
        : card
    )
  };
}

export function constraintPreview(card: AtlasCard, cards: AtlasCard[]) {
  const constraint = createConstraintConfig(card.constraint);
  return `${expressionLabel(constraint.left, cards)} ${constraint.operator} ${expressionLabel(
    constraint.right,
    cards
  )}`;
}

export function getConstraintDependencySummary(
  card: AtlasCard,
  cards: AtlasCard[],
  queries: AtlasCardQuery[]
) {
  const constraint = createConstraintConfig(card.constraint);
  const functionCards = [constraint.left, constraint.right]
    .map((expression) =>
      expression.kind === "function_ref" && expression.functionCardId
        ? cards.find(
            (candidate) =>
              (candidate.id === expression.functionCardId || candidate.modelObjectId === expression.functionCardId) &&
              candidate.type === "function"
          ) ?? null
        : null
    )
    .filter((functionCard): functionCard is AtlasCard => functionCard !== null);
  const participatingCards = uniqueCards(
    functionCards.flatMap((functionCard) =>
      getFunctionDependencySummary(functionCard, queries, cards).matchedCards
    )
  );

  return {
    constraint,
    functionCards,
    participatingCards
  };
}

function expressionLabel(expression: AtlasConstraintExpression, cards: AtlasCard[]) {
  if (expression.kind === "constant") return String(expression.value);
  if (!expression.functionCardId) return "Function";
  return cards.find((card) => card.id === expression.functionCardId || card.modelObjectId === expression.functionCardId)?.title ?? "Missing function";
}

function normalizeConstraintExpression(
  expression: AtlasConstraintExpression | undefined,
  fallbackValue = 0
): AtlasConstraintExpression {
  if (expression?.kind === "function_ref") {
    return createFunctionConstraintExpression(expression.functionCardId ?? null);
  }

  if (expression?.kind === "constant") {
    return createConstantConstraintExpression(expression.value);
  }

  return createConstantConstraintExpression(fallbackValue);
}

function uniqueCards(cards: AtlasCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

export const ATLAS_CONSTRAINT_OPERATORS: AtlasConstraintOperator[] = ["<=", ">=", "=", "=="];
