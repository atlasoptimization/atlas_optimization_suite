import { useMemo, useState } from "react";
import type { AtlasCard, AtlasCardQuery, AtlasExpression } from "../../core/types";
import {
  collectPropertyNamesForQuery,
  createLiteralExpression,
  createMultiplyExpression,
  createPropertyReferenceExpression,
  expressionPreview,
  getMissingPropertyCards
} from "../../core/expressions";
import { evaluateAtlasQuery } from "../../core/queries";
import { AtlasExpressionPreview } from "./AtlasExpressionPreview";

type AtlasPropertySelectorProps = {
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  selectedQueryId: string | null;
};

type ExpressionMode = "property" | "property_times_property" | "property_times_literal";

export function AtlasPropertySelector({
  cards,
  queries,
  selectedQueryId
}: AtlasPropertySelectorProps) {
  const selectedQuery = queries.find((query) => query.id === selectedQueryId) ?? null;
  const propertyNames = useMemo(
    () => (selectedQuery ? collectPropertyNamesForQuery(selectedQuery, cards) : []),
    [cards, selectedQuery]
  );
  const matchedCards = useMemo(
    () => (selectedQuery ? evaluateAtlasQuery(selectedQuery, cards) : []),
    [cards, selectedQuery]
  );
  const [primaryProperty, setPrimaryProperty] = useState("");
  const [secondaryProperty, setSecondaryProperty] = useState("");
  const [literalValue, setLiteralValue] = useState("1");
  const [mode, setMode] = useState<ExpressionMode>("property");

  const selectedProperty = primaryProperty || propertyNames[0] || "";
  const missingCards = selectedQuery
    ? getMissingPropertyCards(selectedQuery, cards, selectedProperty)
    : [];
  const expression = selectedQuery
    ? buildExpression({
        mode,
        queryId: selectedQuery.id,
        primaryProperty: selectedProperty,
        secondaryProperty: secondaryProperty || propertyNames[1] || selectedProperty,
        literalValue
      })
    : null;

  return (
    <section className="atlas-panel atlas-property-selector" aria-label="Property selector">
      <header>
        <p className="atlas-eyebrow">Expression References</p>
        <h2>Property Selector</h2>
      </header>

      {!selectedQuery ? (
        <p className="atlas-muted">Select a query to inspect matching card properties.</p>
      ) : (
        <div className="atlas-property-selector-body">
          <p className="atlas-muted">
            Query <strong>{selectedQuery.name}</strong> matches {matchedCards.length} cards.
          </p>

          {propertyNames.length === 0 ? (
            <p className="atlas-muted">No properties found on matching cards.</p>
          ) : (
            <>
              <label>
                <span>Property</span>
                <select
                  value={selectedProperty}
                  onChange={(event) => setPrimaryProperty(event.target.value)}
                  aria-label="Selected property"
                >
                  {propertyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Preview mode</span>
                <select
                  value={mode}
                  onChange={(event) => setMode(event.target.value as ExpressionMode)}
                  aria-label="Expression preview mode"
                >
                  <option value="property">Property</option>
                  <option value="property_times_property">Property x property</option>
                  <option value="property_times_literal">Property x literal</option>
                </select>
              </label>

              {mode === "property_times_property" && (
                <label>
                  <span>Second property</span>
                  <select
                    value={secondaryProperty || propertyNames[1] || selectedProperty}
                    onChange={(event) => setSecondaryProperty(event.target.value)}
                    aria-label="Second selected property"
                  >
                    {propertyNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {mode === "property_times_literal" && (
                <label>
                  <span>Literal</span>
                  <input
                    value={literalValue}
                    onChange={(event) => setLiteralValue(event.target.value)}
                    aria-label="Literal multiplier"
                  />
                </label>
              )}

              {missingCards.length > 0 && (
                <div className="atlas-property-warning" role="status">
                  <strong>{missingCards.length} matching cards missing {selectedProperty}</strong>
                  <ul>
                    {missingCards.map((card) => (
                      <li key={card.id}>{card.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              {expression && <AtlasExpressionPreview expression={expression} />}
              {expression && (
                <pre className="atlas-expression-json">
                  {JSON.stringify(expression, null, 2)}
                </pre>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function buildExpression(options: {
  mode: ExpressionMode;
  queryId: string;
  primaryProperty: string;
  secondaryProperty: string;
  literalValue: string;
}): AtlasExpression {
  const primary = createPropertyReferenceExpression(options.queryId, options.primaryProperty);

  if (options.mode === "property_times_property") {
    return createMultiplyExpression(
      primary,
      createPropertyReferenceExpression(options.queryId, options.secondaryProperty)
    );
  }

  if (options.mode === "property_times_literal") {
    const numericLiteral = Number(options.literalValue);
    return createMultiplyExpression(
      primary,
      createLiteralExpression(Number.isFinite(numericLiteral) ? numericLiteral : options.literalValue)
    );
  }

  return primary;
}

export function previewExpressionForDisplay(expression: AtlasExpression) {
  return expressionPreview(expression);
}
