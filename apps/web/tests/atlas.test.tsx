import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import App, { getInitialAppView } from "../src/App";
import {
  addAtlasCard,
  addAtlasCardFromTemplate,
  addAtlasProperty,
  addAtlasTag,
  createAtlasCard,
  createAtlasProperty,
  createAtlasTag,
  deleteAtlasCard,
  deleteAtlasProperty,
  deleteAtlasTag,
  updateAtlasProperty,
  updateAtlasTag,
  moveAtlasCard
} from "../src/atlas/core/cards";
import {
  addAtlasGroup,
  createAtlasGroup,
  deleteAtlasGroup,
  updateAtlasGroup
} from "../src/atlas/core/groups";
import {
  createAtlasQuery,
  evaluateAtlasQuery,
  addAtlasQuery,
  addAtlasQueryCondition
} from "../src/atlas/core/queries";
import {
  collectPropertyNamesForQuery,
  createLiteralExpression,
  createMultiplyExpression,
  createPropertyReferenceExpression,
  expressionPreview,
  getMissingPropertyCards
} from "../src/atlas/core/expressions";
import {
  buildTaggedSumExpression,
  createTaggedSumConfig,
  getFunctionDependencySummary,
  getTaggedSumMatchingCards,
  getTaggedSumMissingPropertyCards,
  taggedSumPreview,
  updateTaggedSumConfig
} from "../src/atlas/core/functions";
import { atlasReducer } from "../src/atlas/core/reducer";
import { normalizeAtlasState } from "../src/atlas/storage/localAtlasStorage";
import { getAtlasCardTemplate } from "../src/atlas/core/templates";
import type { AtlasWorkbenchState } from "../src/atlas/core/types";
import { AtlasApp } from "../src/atlas/ui/AtlasApp";
import { AtlasCardView } from "../src/atlas/ui/workbench/AtlasCardView";
import { AtlasGroupView } from "../src/atlas/ui/workbench/AtlasGroupView";
import { AtlasExpressionPreview } from "../src/atlas/ui/query/AtlasExpressionPreview";

function emptyAtlasState(): AtlasWorkbenchState {
  return {
    cards: [],
    groups: [],
    queries: [],
    selectedCardId: null,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

describe("Atlas app skeleton", () => {
  it("renders the Atlas Optimization Suite layout", () => {
    const html = renderToString(<AtlasApp />);

    expect(html).toContain("Atlas Optimization Suite");
    expect(html).toContain("Evaluate");
    expect(html).toContain("Solve");
    expect(html).toContain("Inspect");
    expect(html).toContain("Export");
    expect(html).toContain("Undo");
    expect(html).toContain("Redo");
    expect(html).toContain("Search");
    expect(html).toContain("Build optimization models from typed cards.");
    expect(html).toContain("Objectives");
    expect(html).toContain("Constraints");
    expect(html).toContain("Inspector");
    expect(html).toContain("Solution");
  });

  it("opens Atlas by default and keeps the deck app routable", () => {
    expect(getInitialAppView({ hash: "", search: "" })).toBe("atlas");
    expect(getInitialAppView({ hash: "", search: "?app=deck" })).toBe("deck");
    expect(getInitialAppView({ hash: "#deck", search: "" })).toBe("deck");
  });

  it("renders the default app entry without crashing", () => {
    const html = renderToString(<App />);

    expect(html).toContain("Atlas Optimization Suite");
  });
});

describe("Atlas card model", () => {
  it("creates all basic Atlas card types", () => {
    const state = ["object", "decision", "data", "function", "constraint", "objective"].reduce(
      (current, cardType) =>
        atlasReducer(current, {
          type: "card.create",
          cardType: cardType as Parameters<typeof createAtlasCard>[0]
        }),
      emptyAtlasState()
    );

    expect(state.cards.map((card) => card.type)).toEqual([
      "object",
      "decision",
      "data",
      "function",
      "constraint",
      "objective"
    ]);
    expect(state.selectedCardId).toBe(state.cards.at(-1)?.id);
  });

  it("moves and deletes cards", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const moved = moveAtlasCard(withCard, "card-test", { x: 20, y: 30 });
    const deleted = deleteAtlasCard(moved, "card-test");

    expect(moved.cards[0]?.position).toEqual({ x: 20, y: 30 });
    expect(deleted.cards).toHaveLength(0);
    expect(deleted.selectedCardId).toBeNull();
  });

  it("renders an Atlas card component", () => {
    const card = {
      ...createAtlasCard("function", {
      id: "card-function",
      position: { x: 12, y: 24 }
      }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        {
          id: "prop-cost",
          name: "unit_cost",
          kind: "constant" as const,
          value: 12
        }
      ]
    };
    const html = renderToString(
      <AtlasCardView
        card={card}
        allCards={[card]}
        queries={[]}
        dependencyPropertyNames={new Set()}
        selected
        highlighted
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(html).toContain("Function");
    expect(html).toContain("type");
    expect(html).toContain("product");
    expect(html).toContain("unit_cost");
    expect(html).toContain("12");
    expect(html).toContain("data-card-id=\"card-function\"");
    expect(html).toContain("selected");
    expect(html).toContain("query-highlighted");
  });

  it("adds, updates, and deletes typed tags", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withTag = addAtlasTag(withCard, "card-test", " type ", " product ", "tag-type");
    const updated = updateAtlasTag(withTag, "card-test", "tag-type", "factory", "A");
    const deleted = deleteAtlasTag(updated, "card-test", "tag-type");

    expect(withTag.cards[0]?.tags).toEqual([{ id: "tag-type", key: "type", value: "product" }]);
    expect(updated.cards[0]?.tags).toEqual([{ id: "tag-type", key: "factory", value: "A" }]);
    expect(deleted.cards[0]?.tags).toEqual([]);
  });

  it("rejects empty tag keys", () => {
    expect(() => createAtlasTag("   ", "product")).toThrow("Tag key is required.");
  });

  it("adds, updates, and deletes card properties", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withProperty = addAtlasProperty(
      withCard,
      "card-test",
      " unit_cost ",
      "constant",
      12,
      { id: "prop-cost", unit: " USD " }
    );
    const updated = updateAtlasProperty(
      withProperty,
      "card-test",
      "prop-cost",
      "production_quantity",
      "decision_ref",
      "decision-card",
      { notes: "initial decision reference" }
    );
    const deleted = deleteAtlasProperty(updated, "card-test", "prop-cost");

    expect(withProperty.cards[0]?.properties).toEqual([
      { id: "prop-cost", name: "unit_cost", kind: "constant", value: 12, unit: "USD" }
    ]);
    expect(updated.cards[0]?.properties).toEqual([
      {
        id: "prop-cost",
        name: "production_quantity",
        kind: "decision_ref",
        value: "decision-card",
        notes: "initial decision reference"
      }
    ]);
    expect(deleted.cards[0]?.properties).toEqual([]);
  });

  it("rejects empty property names", () => {
    expect(() => createAtlasProperty("   ", "constant", 12)).toThrow("Property name is required.");
  });

  it("normalizes persisted properties", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "card-test",
          type: "object",
          title: "Object",
          position: { x: 1, y: 2 },
          tags: [],
          properties: [
            {
              id: "prop-cost",
              name: "unit_cost",
              kind: "constant",
              value: 12,
              unit: " USD ",
              notes: " input "
            },
            {
              id: "prop-invalid",
              name: "",
              kind: "constant",
              value: 0
            }
          ],
          notes: ""
        }
      ],
      groups: [
        {
          id: "group-test",
          title: "Factory A",
          position: { x: 10, y: 20 },
          size: { width: 640, height: 360 },
          notes: "visual only"
        }
      ],
      selectedCardId: "card-test"
    });

    expect(normalized.cards[0]?.properties).toEqual([
      {
        id: "prop-cost",
        name: "unit_cost",
        kind: "constant",
        value: 12,
        unit: "USD",
        notes: "input"
      }
    ]);
    expect(normalized.selectedCardId).toBe("card-test");
    expect(normalized.groups[0]?.title).toBe("Factory A");
  });

  it("creates cards from templates with copied tags and properties", () => {
    const state = addAtlasCardFromTemplate(
      emptyAtlasState(),
      "product-like-object"
    );
    const card = state.cards[0];

    expect(card?.title).toBe("Product-like Object");
    expect(card?.type).toBe("object");
    expect(card?.tags.map((tag) => [tag.key, tag.value])).toEqual([
      ["type", "product"],
      ["status", "active"]
    ]);
    expect(card?.properties.map((property) => [property.name, property.kind])).toEqual([
      ["unit_cost", "constant"],
      ["demand", "constant"],
      ["production_quantity", "decision_ref"],
      ["machine_hours_per_unit", "constant"]
    ]);
    expect(state.selectedCardId).toBe(card?.id);
  });

  it("keeps template-created cards independent from templates and each other", () => {
    const firstState = addAtlasCardFromTemplate(
      emptyAtlasState(),
      "generic-object"
    );
    const secondState = addAtlasCardFromTemplate(firstState, "generic-object");
    const firstCard = secondState.cards[0];
    const secondCard = secondState.cards[1];
    const template = getAtlasCardTemplate("generic-object");

    expect(firstCard?.id).not.toBe(secondCard?.id);
    expect(firstCard?.tags[0]?.id).not.toBe(secondCard?.tags[0]?.id);
    expect(firstCard?.tags).not.toBe(template?.defaultTags);

    const updated = updateAtlasTag(secondState, firstCard?.id ?? "", firstCard?.tags[0]?.id ?? "", "type", "changed");

    expect(updated.cards[0]?.tags[0]?.value).toBe("changed");
    expect(updated.cards[1]?.tags[0]?.value).toBe("object");
    expect(template?.defaultTags[0]?.value).toBe("object");
  });

  it("creates, updates, and deletes visual groups without deleting cards", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withGroup = addAtlasGroup(withCard, "group-test");
    const updated = updateAtlasGroup(withGroup, "group-test", {
      title: "Factory A",
      notes: "visual cluster",
      size: { width: 500, height: 300 }
    });
    const deleted = deleteAtlasGroup(updated, "group-test");

    expect(withGroup.groups).toHaveLength(1);
    expect(withGroup.selectedGroupId).toBe("group-test");
    expect(withGroup.selectedCardId).toBeNull();
    expect(updated.groups[0]).toMatchObject({
      title: "Factory A",
      notes: "visual cluster",
      size: { width: 500, height: 300 }
    });
    expect(deleted.groups).toEqual([]);
    expect(deleted.cards).toHaveLength(1);
    expect(deleted.cards[0]?.id).toBe("card-test");
  });

  it("renders a visual group", () => {
    const group = createAtlasGroup({
      id: "group-factory-a",
      title: "Factory A",
      position: { x: 30, y: 40 },
      size: { width: 500, height: 260 },
      notes: "Product cards can sit visually inside this region."
    });
    const html = renderToString(
      <AtlasGroupView group={group} selected onSelect={() => undefined} />
    );

    expect(html).toContain("Factory A");
    expect(html).toContain("data-group-id=\"group-factory-a\"");
    expect(html).toContain("selected");
  });

  it("evaluates queries with one include tag", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }]
    };
    const data = {
      ...createAtlasCard("data", { id: "data-card" }),
      tags: [{ id: "tag-type-data", key: "type", value: "data" }]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(evaluateAtlasQuery(query, [product, data]).map((card) => card.id)).toEqual([
      "product-card"
    ]);
  });

  it("evaluates queries with multiple include tags using AND semantics", () => {
    const factoryProduct = {
      ...createAtlasCard("object", { id: "factory-product" }),
      tags: [
        { id: "tag-type", key: "type", value: "product" },
        { id: "tag-factory", key: "factory", value: "A" }
      ]
    };
    const otherProduct = {
      ...createAtlasCard("object", { id: "other-product" }),
      tags: [{ id: "tag-type-other", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });

    expect(evaluateAtlasQuery(query, [factoryProduct, otherProduct]).map((card) => card.id)).toEqual([
      "factory-product"
    ]);
  });

  it("evaluates queries with exclude tags", () => {
    const activeProduct = {
      ...createAtlasCard("object", { id: "active-product" }),
      tags: [
        { id: "tag-type", key: "type", value: "product" },
        { id: "tag-status", key: "status", value: "active" }
      ]
    };
    const inactiveProduct = {
      ...createAtlasCard("object", { id: "inactive-product" }),
      tags: [
        { id: "tag-type-inactive", key: "type", value: "product" },
        { id: "tag-status-inactive", key: "status", value: "inactive" }
      ]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }],
      excludeTags: [{ id: "condition-status", key: "status", value: "inactive" }]
    });

    expect(evaluateAtlasQuery(query, [activeProduct, inactiveProduct]).map((card) => card.id)).toEqual([
      "active-product"
    ]);
  });

  it("returns no query matches when tags do not match or are missing", () => {
    const cardWithoutTags = createAtlasCard("object", { id: "untagged-card" });
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(evaluateAtlasQuery(query, [cardWithoutTags])).toEqual([]);
  });

  it("creates query conditions through state helpers", () => {
    const withQuery = addAtlasQuery(emptyAtlasState(), "query-test");
    const withCondition = addAtlasQueryCondition(
      withQuery,
      "query-test",
      "includeTags",
      "type",
      "product"
    );

    expect(withCondition.queries[0]?.includeTags).toMatchObject([
      { key: "type", value: "product" }
    ]);
    expect(withCondition.selectedQueryId).toBe("query-test");
  });

  it("collects available property names from query matches", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-demand-a", name: "demand", kind: "constant" as const, value: 10 }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        {
          id: "prop-production-b",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "quantity"
        }
      ]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(collectPropertyNamesForQuery(query, [productA, productB])).toEqual([
      "demand",
      "production_quantity",
      "unit_cost"
    ]);
  });

  it("detects matching cards missing a selected property", () => {
    const completeProduct = {
      ...createAtlasCard("object", { id: "complete-product" }),
      title: "Complete Product",
      tags: [{ id: "tag-type-complete", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-complete", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const missingProduct = {
      ...createAtlasCard("object", { id: "missing-product" }),
      title: "Missing Product",
      tags: [{ id: "tag-type-missing", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });

    expect(getMissingPropertyCards(query, [completeProduct, missingProduct], "unit_cost").map((card) => card.id)).toEqual([
      "missing-product"
    ]);
  });

  it("serializes and previews simple expression references", () => {
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "unit_cost"),
      createLiteralExpression(12)
    );

    expect(expression).toEqual({
      kind: "multiply",
      left: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "unit_cost"
      },
      right: {
        kind: "literal",
        value: 12
      }
    });
    expect(JSON.parse(JSON.stringify(expression))).toEqual(expression);
    expect(expressionPreview(expression)).toBe("unit_cost x 12");
  });

  it("renders an expression preview component", () => {
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "unit_cost"),
      createPropertyReferenceExpression("query-products", "production_quantity")
    );
    const html = renderToString(<AtlasExpressionPreview expression={expression} />);

    expect(html).toContain("unit_cost");
    expect(html).toContain("production_quantity");
  });

  it("creates and updates TaggedSum configuration on function cards", () => {
    const state = addAtlasCard(emptyAtlasState(), "function", "function-card");
    const expression = buildTaggedSumExpression({
      queryId: "query-products",
      primaryProperty: "unit_cost",
      secondaryProperty: "production_quantity"
    });
    const updated = updateTaggedSumConfig(state, "function-card", {
      queryId: "query-products",
      expression,
      displayName: "Total cost",
      description: "Sum cost times quantity."
    });

    expect(updated.cards[0]?.functionKind).toBe("tagged_sum");
    expect(updated.cards[0]?.taggedSum).toEqual(
      createTaggedSumConfig({
        queryId: "query-products",
        expression,
        displayName: "Total cost",
        description: "Sum cost times quantity."
      })
    );
    expect(JSON.parse(JSON.stringify(updated.cards[0]?.taggedSum))).toEqual(
      updated.cards[0]?.taggedSum
    );
  });

  it("reports TaggedSum missing-property diagnostics", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      title: "Product A",
      tags: [
        { id: "tag-type-a", key: "type", value: "product" },
        { id: "tag-factory-a", key: "factory", value: "A" }
      ],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        {
          id: "prop-qty-a",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "qty_a"
        }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      title: "Product B",
      tags: [
        { id: "tag-type-b", key: "type", value: "product" },
        { id: "tag-factory-b", key: "factory", value: "A" }
      ],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 15 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products-a",
      name: "Factory A products",
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-total-cost" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        }),
        displayName: "Total cost"
      })
    };
    const cards = [productA, productB, functionCard];

    expect(getTaggedSumMatchingCards(functionCard, [query], cards).map((card) => card.id)).toEqual([
      "product-a",
      "product-b"
    ]);
    expect(getTaggedSumMissingPropertyCards(functionCard, [query], cards).map((card) => card.id)).toEqual([
      "product-b"
    ]);
  });

  it("extracts Function card dependency summaries without mutating cards", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      title: "Product A",
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        {
          id: "prop-qty-a",
          name: "production_quantity",
          kind: "decision_ref" as const,
          value: "qty_a"
        }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      title: "Product B",
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 15 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      name: "Products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-total" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        displayName: "Total production cost",
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          secondaryProperty: "production_quantity"
        })
      })
    };
    const cards = [productA, productB, functionCard];
    const before = JSON.stringify(cards);
    const summary = getFunctionDependencySummary(functionCard, [query], cards);

    expect(summary.query?.id).toBe("query-products");
    expect(summary.matchedCards.map((card) => card.id)).toEqual(["product-a", "product-b"]);
    expect(summary.usedProperties).toEqual(["production_quantity", "unit_cost"]);
    expect(summary.missingCards.map((card) => card.id)).toEqual(["product-b"]);
    expect(JSON.stringify(cards)).toBe(before);
  });

  it("marks dependency properties when rendering matched cards", () => {
    const card = {
      ...createAtlasCard("object", { id: "product-a" }),
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-demand", name: "demand", kind: "constant" as const, value: 20 }
      ]
    };
    const html = renderToString(
      <AtlasCardView
        card={card}
        allCards={[card]}
        queries={[]}
        dependencyPropertyNames={new Set(["unit_cost"])}
        selected={false}
        highlighted
        onPointerDown={() => undefined}
        onPointerMove={() => undefined}
        onPointerUp={() => undefined}
        onPointerCancel={() => undefined}
      />
    );

    expect(html).toContain("dependency-property");
    expect(html).toContain("unit_cost");
  });

  it("previews TaggedSum cards with query, expression, and match count", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      name: "Products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-sum" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost",
          literalValue: "2"
        }),
        displayName: "Double cost"
      })
    };

    expect(taggedSumPreview(functionCard, [query], [product, functionCard])).toEqual({
      queryName: "Products",
      expressionLabel: "unit_cost x 2",
      matchCount: 1
    });
  });

  it("normalizes persisted TaggedSum function cards", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "function-sum",
          type: "function",
          functionKind: "tagged_sum",
          title: "Total cost",
          position: { x: 1, y: 2 },
          tags: [],
          properties: [],
          taggedSum: {
            queryId: "query-products",
            displayName: "Total cost",
            expression: {
              kind: "multiply",
              left: {
                kind: "property_ref",
                queryId: "query-products",
                propertyName: "unit_cost"
              },
              right: {
                kind: "property_ref",
                queryId: "query-products",
                propertyName: "production_quantity"
              }
            }
          },
          notes: ""
        }
      ],
      queries: [
        {
          id: "query-products",
          name: "Products",
          includeTags: [{ id: "condition-type", key: "type", value: "product" }],
          excludeTags: []
        }
      ],
      selectedCardId: "function-sum"
    });

    expect(normalized.cards[0]?.functionKind).toBe("tagged_sum");
    expect(normalized.cards[0]?.taggedSum?.displayName).toBe("Total cost");
    expect(normalized.cards[0]?.taggedSum?.expression).toEqual({
      kind: "multiply",
      left: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "unit_cost"
      },
      right: {
        kind: "property_ref",
        queryId: "query-products",
        propertyName: "production_quantity"
      }
    });
    expect(normalized.selectedCardId).toBe("function-sum");
  });
});
