import type { AtlasCard, AtlasCardQuery, AtlasExpression } from "./types";
import { evaluateAtlasQuery } from "./queries";

export function collectPropertyNamesForQuery(query: AtlasCardQuery, cards: AtlasCard[]) {
  const names = new Set<string>();
  for (const card of evaluateAtlasQuery(query, cards)) {
    for (const property of card.properties) {
      names.add(property.name);
    }
  }
  return [...names].sort((left, right) => left.localeCompare(right));
}

export function getMissingPropertyCards(
  query: AtlasCardQuery,
  cards: AtlasCard[],
  propertyName: string
) {
  if (!propertyName.trim()) return [];

  return evaluateAtlasQuery(query, cards).filter(
    (card) => !card.properties.some((property) => property.name === propertyName)
  );
}

export function createPropertyReferenceExpression(
  queryId: string,
  propertyName: string
): AtlasExpression {
  return {
    kind: "property_ref",
    queryId,
    propertyName
  };
}

export function createLiteralExpression(value: string | number): AtlasExpression {
  return { kind: "literal", value };
}

export function createMultiplyExpression(
  left: AtlasExpression,
  right: AtlasExpression
): AtlasExpression {
  return { kind: "multiply", left, right };
}

export function createAddExpression(terms: AtlasExpression[]): AtlasExpression {
  return { kind: "add", terms };
}

export function expressionPreview(expression: AtlasExpression): string {
  switch (expression.kind) {
    case "literal":
      return String(expression.value);
    case "property_ref":
      return expression.propertyName || "property";
    case "multiply":
      return `${expressionPreview(expression.left)} x ${expressionPreview(expression.right)}`;
    case "add":
      return expression.terms.map(expressionPreview).join(" + ");
  }
}
