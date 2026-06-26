import type { AtlasCard, AtlasCardQuery, AtlasExpression } from "./types";
import { evaluateAtlasQuery } from "./queries";

export type AtlasLinearTermDraft = {
  id: string;
  coefficient: string;
  propertyName: string;
  multiplierPropertyName?: string;
};

export type AtlasExpressionValidationDiagnostic = {
  level: "warning" | "error";
  message: string;
};

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

export function buildLinearExpressionFromTerms(
  queryId: string,
  terms: AtlasLinearTermDraft[]
): AtlasExpression | null {
  const expressions = terms
    .filter((term) => term.propertyName.trim())
    .map((term) => {
      const property = createPropertyReferenceExpression(queryId, term.propertyName.trim());
      const coefficient = Number(term.coefficient);
      const hasCoefficient = term.coefficient.trim() !== "" && Number.isFinite(coefficient) && coefficient !== 1;
      const base = hasCoefficient
        ? createMultiplyExpression(createLiteralExpression(coefficient), property)
        : property;

      if (term.multiplierPropertyName?.trim()) {
        return createMultiplyExpression(
          base,
          createPropertyReferenceExpression(queryId, term.multiplierPropertyName.trim())
        );
      }

      return base;
    });

  if (expressions.length === 0) return null;
  return expressions.length === 1 ? expressions[0] ?? null : createAddExpression(expressions);
}

export function expressionToLinearTermDrafts(expression: AtlasExpression | null): AtlasLinearTermDraft[] {
  if (!expression) return [createLinearTermDraft()];
  const terms = expression.kind === "add" ? expression.terms : [expression];
  return terms.map((term, index) => expressionTermToDraft(term, index));
}

export function createLinearTermDraft(options: Partial<AtlasLinearTermDraft> = {}): AtlasLinearTermDraft {
  return {
    id: options.id ?? `term_${Math.random().toString(36).slice(2, 9)}`,
    coefficient: options.coefficient ?? "1",
    propertyName: options.propertyName ?? "",
    multiplierPropertyName: options.multiplierPropertyName
  };
}

export function validateLinearExpression(
  expression: AtlasExpression | null,
  cards: AtlasCard[],
  query: AtlasCardQuery | null
): AtlasExpressionValidationDiagnostic[] {
  if (!expression || !query) return [];
  const matchedCards = evaluateAtlasQuery(query, cards);
  const diagnostics: AtlasExpressionValidationDiagnostic[] = [];
  visitTerms(expression, (term) => {
    if (term.kind !== "multiply") return;
    const propertyRefs = collectPropertyRefs(term);
    if (propertyRefs.length < 2) return;
    const constantProperties = propertyRefs.filter((propertyName) =>
      matchedCards.every((card) => {
        const property = card.properties.find((candidate) => candidate.name === propertyName);
        return property?.kind === "constant" && isNumericPrimitive(property.value);
      })
    );
    if (constantProperties.length === 0) {
      diagnostics.push({
        level: "warning",
        message:
          "Property x property terms are only linear when one property is constant-valued across all matched cards."
      });
    }
  });
  return diagnostics;
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

function expressionTermToDraft(expression: AtlasExpression, index: number): AtlasLinearTermDraft {
  const id = `term_${index}`;
  if (expression.kind === "property_ref") {
    return createLinearTermDraft({ id, propertyName: expression.propertyName });
  }
  if (expression.kind === "multiply") {
    const factors = flattenMultiply(expression);
    const literal = factors.find((factor) => factor.kind === "literal");
    const properties = factors.filter((factor): factor is Extract<AtlasExpression, { kind: "property_ref" }> =>
      factor.kind === "property_ref"
    );
    return createLinearTermDraft({
      id,
      coefficient: literal ? String(literal.value) : "1",
      propertyName: properties[0]?.propertyName ?? "",
      multiplierPropertyName: properties[1]?.propertyName
    });
  }
  return createLinearTermDraft({ id, propertyName: expressionPreview(expression) });
}

function flattenMultiply(expression: AtlasExpression): AtlasExpression[] {
  return expression.kind === "multiply"
    ? [...flattenMultiply(expression.left), ...flattenMultiply(expression.right)]
    : [expression];
}

function visitTerms(expression: AtlasExpression, visitor: (term: AtlasExpression) => void) {
  if (expression.kind === "add") {
    expression.terms.forEach((term) => visitTerms(term, visitor));
    return;
  }
  visitor(expression);
}

function collectPropertyRefs(expression: AtlasExpression): string[] {
  if (expression.kind === "property_ref") return [expression.propertyName];
  if (expression.kind === "multiply") {
    return [...collectPropertyRefs(expression.left), ...collectPropertyRefs(expression.right)];
  }
  if (expression.kind === "add") return expression.terms.flatMap(collectPropertyRefs);
  return [];
}

function isNumericPrimitive(value: AtlasCard["properties"][number]["value"]) {
  return (
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value)))
  );
}
