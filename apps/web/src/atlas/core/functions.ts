import {
  createLiteralExpression,
  createMultiplyExpression,
  createPropertyReferenceExpression,
  expressionPreview
} from "./expressions";
import { evaluateAtlasQuery } from "./queries";
import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasExpression,
  AtlasTaggedSumConfig,
  AtlasWorkbenchState
} from "./types";

export function createTaggedSumConfig(
  options: Partial<AtlasTaggedSumConfig> = {}
): AtlasTaggedSumConfig {
  return {
    queryId: options.queryId ?? null,
    expression: options.expression ?? null,
    displayName: options.displayName?.trim() || "TaggedSum",
    ...(options.description?.trim() ? { description: options.description.trim() } : {})
  };
}

export function buildTaggedSumExpression(options: {
  queryId: string;
  primaryProperty: string;
  secondaryProperty?: string;
  literalValue?: string;
}): AtlasExpression {
  const primary = createPropertyReferenceExpression(options.queryId, options.primaryProperty);

  if (options.secondaryProperty) {
    return createMultiplyExpression(
      primary,
      createPropertyReferenceExpression(options.queryId, options.secondaryProperty)
    );
  }

  if (options.literalValue !== undefined) {
    const numericLiteral = Number(options.literalValue);
    return createMultiplyExpression(
      primary,
      createLiteralExpression(Number.isFinite(numericLiteral) ? numericLiteral : options.literalValue)
    );
  }

  return primary;
}

export function updateTaggedSumConfig(
  state: AtlasWorkbenchState,
  cardId: string,
  patch: Partial<AtlasTaggedSumConfig>
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) => {
      if (card.id !== cardId || card.type !== "function") return card;
      const current = createTaggedSumConfig(card.taggedSum);
      const next = createTaggedSumConfig({
        ...current,
        ...patch
      });
      return {
        ...card,
        functionKind: "tagged_sum",
        taggedSum: next
      };
    })
  };
}

export function getTaggedSumQuery(card: AtlasCard, queries: AtlasCardQuery[]) {
  if (card.type !== "function" || card.functionKind !== "tagged_sum") return null;
  const queryId = card.taggedSum?.queryId;
  return queryId ? queries.find((query) => query.id === queryId) ?? null : null;
}

export function getTaggedSumMatchingCards(
  card: AtlasCard,
  queries: AtlasCardQuery[],
  cards: AtlasCard[]
) {
  const query = getTaggedSumQuery(card, queries);
  return query ? evaluateAtlasQuery(query, cards) : [];
}

export function getTaggedSumMissingPropertyCards(
  card: AtlasCard,
  queries: AtlasCardQuery[],
  cards: AtlasCard[]
) {
  const query = getTaggedSumQuery(card, queries);
  const expression = card.taggedSum?.expression;
  if (!query || !expression) return [];

  const propertyNames = collectExpressionPropertyNames(expression);
  if (propertyNames.length === 0) return [];

  return evaluateAtlasQuery(query, cards).filter((matchedCard) =>
    propertyNames.some(
      (propertyName) =>
        !matchedCard.properties.some((property) => property.name === propertyName)
    )
  );
}

export function getFunctionDependencySummary(
  card: AtlasCard,
  queries: AtlasCardQuery[],
  cards: AtlasCard[]
) {
  const query = getTaggedSumQuery(card, queries);
  const matchedCards = query ? evaluateAtlasQuery(query, cards) : [];
  const usedProperties = card.taggedSum?.expression
    ? collectExpressionPropertyNames(card.taggedSum.expression)
    : [];
  const missingCards =
    query && usedProperties.length > 0
      ? matchedCards.filter((matchedCard) =>
          usedProperties.some(
            (propertyName) =>
              !matchedCard.properties.some((property) => property.name === propertyName)
          )
        )
      : [];

  return {
    query,
    matchedCards,
    usedProperties,
    missingCards
  };
}

export function collectExpressionPropertyNames(expression: AtlasExpression): string[] {
  const names = new Set<string>();
  visitExpression(expression, names);
  return [...names].sort((left, right) => left.localeCompare(right));
}

export function taggedSumPreview(
  card: AtlasCard,
  queries: AtlasCardQuery[],
  cards: AtlasCard[]
) {
  const query = getTaggedSumQuery(card, queries);
  const expression = card.taggedSum?.expression;
  return {
    queryName: query?.name ?? "No query selected",
    expressionLabel: expression ? expressionPreview(expression) : "No expression selected",
    matchCount: query ? evaluateAtlasQuery(query, cards).length : 0
  };
}

function visitExpression(expression: AtlasExpression, names: Set<string>) {
  switch (expression.kind) {
    case "property_ref":
      if (expression.propertyName.trim()) names.add(expression.propertyName);
      return;
    case "multiply":
      visitExpression(expression.left, names);
      visitExpression(expression.right, names);
      return;
    case "add":
      expression.terms.forEach((term) => visitExpression(term, names));
      return;
    case "literal":
      return;
  }
}
