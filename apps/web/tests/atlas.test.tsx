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
  updateAtlasCardDetails,
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
  buildLinearExpressionFromTerms,
  collectPropertyNamesForQuery,
  createLiteralExpression,
  createLinearTermDraft,
  createMultiplyExpression,
  createPropertyReferenceExpression,
  expressionPreview,
  validateLinearExpression,
  getMissingPropertyCards
} from "../src/atlas/core/expressions";
import { parseAtlasCsv } from "../src/atlas/core/csv";
import {
  createIndexSet,
  createRangeIndexSet,
  indexedPropertyLabel
} from "../src/atlas/core/indexSets";
import {
  attachAtlasModule,
  deleteAtlasModule,
  updateAtlasModule
} from "../src/atlas/core/modules";
import {
  markSolveDiagnosticsStale,
  upsertRuntimeDiagnostics
} from "../src/atlas/core/runtimeDiagnostics";
import {
  buildTaggedSumExpression,
  createTaggedSumConfig,
  getFunctionDependencySummary,
  getTaggedSumMatchingCards,
  getTaggedSumMissingPropertyCards,
  taggedSumPreview,
  updateTaggedSumConfig
} from "../src/atlas/core/functions";
import {
  addObjectiveTerm,
  createObjectiveConfig,
  getObjectiveDependencySummary,
  moveObjectiveTerm,
  objectivePreview,
  updateObjectiveConfig,
  updateObjectiveTerm
} from "../src/atlas/core/objectives";
import {
  constraintPreview,
  createConstantConstraintExpression,
  createConstraintConfig,
  createFunctionConstraintExpression,
  getConstraintDependencySummary,
  updateConstraintConfig
} from "../src/atlas/core/constraints";
import {
  evaluateAtlasWorkbench,
  evaluateExpression
} from "../src/atlas/core/evaluator";
import {
  renderCardSymbolicPreview,
  renderExpressionSymbol
} from "../src/atlas/core/symbolic";
import {
  exportAtlasIR,
  importAtlasIR,
  serializeAtlasIR,
  validateAtlasIR
} from "../src/atlas/core/ir";
import { createProductionPlanningExample } from "../src/atlas/core/examples";
import {
  createAtlasProjectFile,
  importAtlasProject,
  serializeAtlasProject
} from "../src/atlas/core/project";
import {
  parseAtlasSolveResult,
  resolveSolutionVariableTarget,
  type AtlasSolutionState
} from "../src/atlas/core/solution";
import {
  createAtlasCommands,
  filterAtlasCommands,
  searchAtlasCards
} from "../src/atlas/core/search";
import {
  checkAtlasBackendHealth,
  evaluateAtlasModel,
  generateAtlasCode,
  solveAtlasModel,
  validateAtlasModel
} from "../src/atlas/api/backendClient";
import { atlasReducer } from "../src/atlas/core/reducer";
import { normalizeAtlasState } from "../src/atlas/storage/localAtlasStorage";
import { getAtlasCardTemplate } from "../src/atlas/core/templates";
import type { AtlasWorkbenchState } from "../src/atlas/core/types";
import { AtlasApp } from "../src/atlas/ui/AtlasApp";
import { AtlasCardView } from "../src/atlas/ui/workbench/AtlasCardView";
import { AtlasGroupView } from "../src/atlas/ui/workbench/AtlasGroupView";
import { AtlasExpressionPreview } from "../src/atlas/ui/query/AtlasExpressionPreview";
import { AtlasSolutionPanel } from "../src/atlas/ui/solution/AtlasSolutionPanel";
import { AtlasSearchPalette } from "../src/atlas/ui/search/AtlasSearchPalette";

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

  it("renders an active command palette with search and commands", () => {
    const state = createProductionPlanningExample();
    const html = renderToString(
      <AtlasSearchPalette
        cards={state.cards}
        templates={[]}
        onClose={() => undefined}
        onSelectCard={() => undefined}
        onRunCommand={() => undefined}
      />
    );

    expect(html).toContain("Command palette");
    expect(html).toContain("Create Object card");
    expect(html).toContain("Load production planning example");
    expect(html).toContain("Search Atlas model and commands");
    expect(html).not.toContain("disabled");
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

  it("updates card title and notes", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "objective", "objective-card");
    const updated = updateAtlasCardDetails(withCard, "objective-card", {
      title: "Profit objective",
      notes: "Primary optimization target"
    });

    expect(updated.cards[0]?.title).toBe("Profit objective");
    expect(updated.cards[0]?.notes).toBe("Primary optimization target");
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
      ],
      modules: [
        {
          id: "module-price",
          kind: "property" as const,
          label: "price",
          value: "15",
          position: { x: 20, y: 22 }
        }
      ]
    };
    const html = renderToString(
      <AtlasCardView
        card={card}
        allCards={[card]}
        queries={[]}
        dependencyPropertyNames={new Set()}
        diagnostics={[
          {
            cardId: card.id,
            diagnosticId: "eval",
            label: "value",
            value: "12",
            status: "ok",
            source: "evaluate"
          }
        ]}
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
    expect(html).toContain("price");
    expect(html).toContain("value");
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

  it("attaches, updates, moves, and deletes living card modules", () => {
    const withCard = addAtlasCard(emptyAtlasState(), "object", "card-test");
    const withModule = attachAtlasModule(withCard, "card-test", "property", {
      id: "module-cost",
      label: "cost",
      value: "12",
      position: { x: 20, y: 30 }
    });
    const updated = updateAtlasModule(withModule, "card-test", "module-cost", {
      value: "14",
      unit: "USD",
      position: { x: 40, y: 50 }
    });
    const deleted = deleteAtlasModule(updated, "card-test", "module-cost");

    expect(withModule.cards[0]?.modules?.[0]).toMatchObject({
      kind: "property",
      label: "cost",
      value: "12"
    });
    expect(updated.cards[0]?.modules?.[0]).toMatchObject({
      value: "14",
      unit: "USD",
      position: { x: 40, y: 50 }
    });
    expect(deleted.cards[0]?.modules).toEqual([]);
  });

  it("normalizes persisted modules with cards", () => {
    const normalized = normalizeAtlasState({
      cards: [
        {
          id: "card-test",
          type: "object",
          modules: [
            {
              id: "module-tag",
              kind: "tag",
              label: "type",
              value: "product",
              position: { x: 10, y: 14 }
            }
          ]
        }
      ]
    });

    expect(normalized.cards[0]?.modules?.[0]).toMatchObject({
      id: "module-tag",
      kind: "tag",
      label: "type",
      value: "product",
      position: { x: 10, y: 14 }
    });
  });

  it("updates and marks runtime diagnostics stale", () => {
    const diagnostics = upsertRuntimeDiagnostics([], [
      {
        cardId: "card-test",
        diagnosticId: "solve:quantity",
        label: "solution",
        value: "4",
        status: "ok",
        source: "solve"
      }
    ]);

    expect(diagnostics).toHaveLength(1);
    expect(markSolveDiagnosticsStale(diagnostics)[0]?.status).toBe("stale");
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

  it("builds and validates structured linear expression terms", () => {
    const expression = buildLinearExpressionFromTerms("query-products", [
      createLinearTermDraft({ id: "term-a", coefficient: "2", propertyName: "production_quantity" }),
      createLinearTermDraft({ id: "term-b", coefficient: "5", propertyName: "storage_quantity" })
    ]);

    expect(expression).toEqual({
      kind: "add",
      terms: [
        {
          kind: "multiply",
          left: { kind: "literal", value: 2 },
          right: {
            kind: "property_ref",
            queryId: "query-products",
            propertyName: "production_quantity"
          }
        },
        {
          kind: "multiply",
          left: { kind: "literal", value: 5 },
          right: {
            kind: "property_ref",
            queryId: "query-products",
            propertyName: "storage_quantity"
          }
        }
      ]
    });
  });

  it("warns when property times property is nonlinear", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const card = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-a", name: "a", kind: "decision_ref" as const, value: "decision-a" },
        { id: "prop-b", name: "b", kind: "decision_ref" as const, value: "decision-b" }
      ]
    };
    const expression = createMultiplyExpression(
      createPropertyReferenceExpression("query-products", "a"),
      createPropertyReferenceExpression("query-products", "b")
    );

    expect(validateLinearExpression(expression, [card], query)[0]?.message).toContain(
      "Property x property"
    );
  });

  it("parses CSV data for Data cards", () => {
    const parsed = parseAtlasCsv("product,demand\nA,10\nB,12\n", "Demand.csv");

    expect(parsed.fileName).toBe("Demand.csv");
    expect(parsed.columns).toEqual(["product", "demand"]);
    expect(parsed.rowCount).toBe(2);
    expect(parsed.previewRows[0]).toEqual({ product: "A", demand: "10" });
  });

  it("creates and labels finite index sets for indexed properties", () => {
    const weeks = createRangeIndexSet("Weeks", 1, 12);
    const indexCard = {
      ...createAtlasCard("data", { id: "weeks" }),
      title: "Weeks",
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: weeks
      }
    };
    const property = createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
      indexSetId: "weeks"
    });

    expect(createIndexSet(" Scenarios ", [" base ", " stress "])).toEqual({
      name: "Scenarios",
      elements: ["base", "stress"]
    });
    expect(weeks.elements).toEqual(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]);
    expect(indexedPropertyLabel(property, [indexCard])).toBe("production_quantity[Weeks]");
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
        diagnostics={[]}
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

  it("adds, updates, and reorders objective terms", () => {
    const withObjective = addAtlasCard(emptyAtlasState(), "objective", "objective-card");
    const configured = updateObjectiveConfig(withObjective, "objective-card", {
      direction: "maximize"
    });
    const withFirstTerm = addObjectiveTerm(configured, "objective-card", "function-a");
    const withSecondTerm = addObjectiveTerm(withFirstTerm, "objective-card", "function-b");
    const firstTermId = withSecondTerm.cards[0]?.objective?.terms[0]?.id ?? "";
    const secondTermId = withSecondTerm.cards[0]?.objective?.terms[1]?.id ?? "";
    const renamed = updateObjectiveTerm(
      withSecondTerm,
      "objective-card",
      secondTermId,
      "Revenue",
      "function-b"
    );
    const reordered = moveObjectiveTerm(renamed, "objective-card", secondTermId, "up");

    expect(reordered.cards[0]?.objective?.direction).toBe("maximize");
    expect(reordered.cards[0]?.objective?.terms.map((term) => term.id)).toEqual([
      secondTermId,
      firstTermId
    ]);
    expect(reordered.cards[0]?.objective?.terms[0]).toMatchObject({
      name: "Revenue",
      functionCardId: "function-b"
    });
  });

  it("extracts objective dependencies through referenced Function cards", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      title: "Product",
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost"
        }),
        displayName: "Total cost"
      })
    };
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const summary = getObjectiveDependencySummary(
      objective,
      [product, functionCard, objective],
      [query],
      { termId: "term-cost" }
    );

    expect(summary.functionCards.map((card) => card.id)).toEqual(["function-cost"]);
    expect(summary.participatingCards.map((card) => card.id)).toEqual(["product-card"]);
    expect(objectivePreview(objective, [functionCard]).directionLabel).toBe("Minimize");
  });

  it("updates and previews constraint cards", () => {
    const withConstraint = addAtlasCard(emptyAtlasState(), "constraint", "constraint-card");
    const updated = updateConstraintConfig(withConstraint, "constraint-card", {
      name: "Capacity",
      left: createFunctionConstraintExpression("function-hours"),
      operator: "<=",
      right: createConstantConstraintExpression(100)
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-hours" }),
      title: "Total hours"
    };
    const constraint = updated.cards[0];

    expect(constraint?.constraint).toEqual(
      createConstraintConfig({
        name: "Capacity",
        left: createFunctionConstraintExpression("function-hours"),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    );
    expect(constraint ? constraintPreview(constraint, [functionCard, constraint]) : "").toBe(
      "Total hours <= 100"
    );
  });

  it("extracts constraint dependencies through referenced Function cards", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-hours", name: "machine_hours", kind: "constant" as const, value: 4 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-hours" }),
      title: "Total hours",
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "machine_hours"
        }),
        displayName: "Total hours"
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        name: "Capacity",
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const summary = getConstraintDependencySummary(
      constraint,
      [product, functionCard, constraint],
      [query]
    );

    expect(summary.functionCards.map((card) => card.id)).toEqual(["function-hours"]);
    expect(summary.participatingCards.map((card) => card.id)).toEqual(["product-card"]);
  });

  it("evaluates TaggedSum functions from current property values", () => {
    const productA = {
      ...createAtlasCard("object", { id: "product-a" }),
      tags: [{ id: "tag-type-a", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-a", name: "unit_cost", kind: "constant" as const, value: 12 },
        { id: "prop-qty-a", name: "production_quantity", kind: "decision_ref" as const, value: 2 }
      ]
    };
    const productB = {
      ...createAtlasCard("object", { id: "product-b" }),
      tags: [{ id: "tag-type-b", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost-b", name: "unit_cost", kind: "constant" as const, value: 8 },
        { id: "prop-qty-b", name: "production_quantity", kind: "decision_ref" as const, value: 3 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
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
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [productA, productB, functionCard],
      queries: [query]
    });

    expect(report.entries["function-cost"]?.value).toEqual({ kind: "number", value: 48 });
    expect(report.entries["function-cost"]?.diagnostics).toEqual([]);
  });

  it("reports missing properties and invalid expressions during evaluation", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: buildTaggedSumExpression({
          queryId: query.id,
          primaryProperty: "unit_cost"
        }),
        displayName: "Total cost"
      })
    };
    const invalid = evaluateExpression(
      { kind: "unknown" } as Parameters<typeof evaluateExpression>[0],
      product
    );
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [product, functionCard],
      queries: [query]
    });

    expect(report.entries["function-cost"]?.value).toBeNull();
    expect(report.entries["function-cost"]?.diagnostics[0]?.message).toContain("missing property");
    expect(invalid.diagnostics[0]?.message).toContain("not supported");
  });

  it("evaluates objectives and constraint sides", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 5 },
        { id: "prop-qty", name: "production_quantity", kind: "decision_ref" as const, value: 4 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
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
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        name: "Budget",
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(25)
      })
    };
    const report = evaluateAtlasWorkbench({
      ...emptyAtlasState(),
      cards: [product, functionCard, objective, constraint],
      queries: [query]
    });

    expect(report.entries["objective-card"]?.value).toEqual({ kind: "number", value: 20 });
    expect(report.entries["constraint-card"]?.value).toEqual({
      kind: "constraint",
      left: 20,
      right: 25,
      satisfied: true
    });
  });

  it("renders symbolic TaggedSum, objective, and constraint mathematics", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [
        { id: "condition-type", key: "type", value: "product" },
        { id: "condition-factory", key: "factory", value: "A" }
      ]
    });
    const functionCard = {
      ...createAtlasCard("function", { id: "function-cost" }),
      title: "Total cost",
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
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: functionCard.id }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        left: createFunctionConstraintExpression(functionCard.id),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const state = {
      ...emptyAtlasState(),
      cards: [functionCard, objective, constraint],
      queries: [query]
    };

    expect(renderExpressionSymbol(functionCard.taggedSum?.expression ?? createLiteralExpression(0))).toBe(
      "unit_cost × production_quantity"
    );
    expect(renderCardSymbolicPreview(functionCard, state)?.expression).toBe(
      "Σ(unit_cost × production_quantity | type=product, factory=A)"
    );
    expect(renderCardSymbolicPreview(objective, state)?.expression).toContain("min Σ(");
    expect(renderCardSymbolicPreview(constraint, state)?.expression).toContain("<= 100");
  });

  it("renders indexed properties in symbolic previews", () => {
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const weeks = {
      ...createAtlasCard("data", { id: "weeks" }),
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: createRangeIndexSet("Weeks", 1, 12)
      }
    };
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
          id: "prop-quantity",
          indexSetId: "weeks"
        })
      ]
    };
    const functionCard = {
      ...createAtlasCard("function", { id: "function-production" }),
      taggedSum: createTaggedSumConfig({
        queryId: query.id,
        expression: createPropertyReferenceExpression(query.id, "production_quantity")
      })
    };

    expect(
      renderCardSymbolicPreview(functionCard, {
        ...emptyAtlasState(),
        cards: [weeks, product, functionCard],
        queries: [query]
      })?.expression
    ).toContain("production_quantity[Weeks]");
  });

  it("serializes Atlas IR with schema version", () => {
    const state = addAtlasCard(emptyAtlasState(), "object", "product-card");
    const ir = exportAtlasIR(state, { exportedAt: "2026-01-01T00:00:00.000Z" });

    expect(ir.schemaVersion).toBe("0.1");
    expect(ir.metadata.source).toBe("atlas-gui");
    expect(serializeAtlasIR(ir)).toContain('"schemaVersion": "0.1"');
  });

  it("roundtrips Atlas IR cards, queries, groups, objectives, constraints, and layout", () => {
    const product = {
      ...createAtlasCard("object", { id: "product-card", position: { x: 10, y: 20 } }),
      tags: [{ id: "tag-type", key: "type", value: "product" }],
      properties: [
        { id: "prop-cost", name: "unit_cost", kind: "constant" as const, value: 12 }
      ]
    };
    const query = createAtlasQuery({
      id: "query-products",
      includeTags: [{ id: "condition-type", key: "type", value: "product" }]
    });
    const objective = {
      ...createAtlasCard("objective", { id: "objective-card" }),
      objective: createObjectiveConfig({
        direction: "minimize",
        terms: [{ id: "term-cost", name: "Cost", functionCardId: "function-cost" }]
      })
    };
    const constraint = {
      ...createAtlasCard("constraint", { id: "constraint-card" }),
      constraint: createConstraintConfig({
        left: createFunctionConstraintExpression("function-cost"),
        operator: "<=",
        right: createConstantConstraintExpression(100)
      })
    };
    const state = {
      ...emptyAtlasState(),
      cards: [product, objective, constraint],
      queries: [query],
      groups: [
        {
          id: "group-a",
          title: "Factory A",
          position: { x: 0, y: 0 },
          size: { width: 400, height: 240 },
          notes: "layout"
        }
      ]
    };
    const imported = importAtlasIR(JSON.parse(serializeAtlasIR(exportAtlasIR(state))));

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.cards.map((card) => card.id)).toEqual([
      "product-card",
      "objective-card",
      "constraint-card"
    ]);
    expect(imported.state.cards[0]?.position).toEqual({ x: 10, y: 20 });
    expect(imported.state.queries[0]?.id).toBe("query-products");
    expect(imported.state.groups[0]?.title).toBe("Factory A");
  });

  it("roundtrips indexed property metadata through Atlas IR", () => {
    const weeks = {
      ...createAtlasCard("data", { id: "weeks" }),
      title: "Weeks",
      data: {
        fileName: "Weeks.index",
        columns: [],
        rowCount: 0,
        previewRows: [],
        indexSet: createRangeIndexSet("Weeks", 1, 12)
      }
    };
    const product = {
      ...createAtlasCard("object", { id: "product-card" }),
      properties: [
        createAtlasProperty("production_quantity", "decision_ref", "decision-prod", {
          id: "prop-quantity",
          indexSetId: "weeks"
        })
      ]
    };
    const imported = importAtlasIR(
      JSON.parse(serializeAtlasIR(exportAtlasIR({ ...emptyAtlasState(), cards: [weeks, product] })))
    );

    expect(imported.diagnostics).toEqual([]);
    expect(imported.state.cards[0]?.data?.indexSet?.elements).toHaveLength(12);
    expect(imported.state.cards[1]?.properties[0]?.indexSetId).toBe("weeks");
  });

  it("validates required Atlas IR fields", () => {
    expect(validateAtlasIR({ schemaVersion: "0.1", cards: [{ type: "object" }], queries: [], groups: [] })).toEqual([
      "Card at index 0 is missing required id."
    ]);
  });

  it("roundtrips Atlas project JSON through the IR importer", () => {
    const state = createProductionPlanningExample();
    const parsed = importAtlasProject(JSON.parse(serializeAtlasProject(createAtlasProjectFile(state))));

    expect(parsed.diagnostics).toEqual([]);
    expect(parsed.state.cards).toHaveLength(state.cards.length);
    expect(parsed.state.queries[0]?.id).toBe("query-products-factory-a");
  });

  it("provides a production planning example with objective, constraint, and decision refs", () => {
    const example = createProductionPlanningExample();
    const ir = exportAtlasIR(example, { exportedAt: "2026-01-01T00:00:00.000Z" });

    expect(validateAtlasIR(ir)).toEqual([]);
    expect(example.cards.filter((card) => card.type === "object")).toHaveLength(3);
    expect(example.cards.some((card) => card.type === "objective")).toBe(true);
    expect(example.cards.some((card) => card.type === "constraint")).toBe(true);
    expect(
      example.cards
        .filter((card) => card.type === "object")
        .every((card) =>
          card.properties.some(
            (property) => property.name === "production_quantity" && property.kind === "decision_ref"
          )
        )
    ).toBe(true);
  });

  it("parses solve results and maps variables back to cards/properties", () => {
    const example = createProductionPlanningExample();
    const parsed = parseAtlasSolveResult({
      status: "optimal",
      objectiveValue: 120,
      variableValues: { "decision-alpha": 5, "product-alpha.production_quantity": 5 },
      constraints: {
        "constraint-capacity": {
          left: 40,
          right: 40,
          residual: 0,
          satisfied: true
        }
      },
      diagnostics: [],
      code: "import cvxpy as cp"
    });

    expect(parsed.status).toBe("optimal");
    expect(parsed.constraints?.["constraint-capacity"]?.satisfied).toBe(true);
    expect(resolveSolutionVariableTarget("decision-alpha", example.cards)).toEqual({
      cardId: "decision-alpha"
    });
    expect(resolveSolutionVariableTarget("product-alpha.production_quantity", example.cards)).toEqual({
      cardId: "product-alpha",
      propertyName: "production_quantity"
    });
  });

  it("renders solution panel empty, loading, success, error, and stale states", () => {
    const baseProps = {
      statusMessage: "Ready",
      updatedAt: "10:00",
      backendStatus: "connected" as const,
      backendDiagnostics: []
    };
    const success: AtlasSolutionState = {
      status: "success",
      stale: false,
      result: {
        status: "optimal",
        objectiveValue: 120,
        variableValues: { "decision-alpha": 5 },
        constraints: {
          "constraint-capacity": { left: 40, right: 40, residual: 0, satisfied: true }
        },
        diagnostics: [],
        code: "import cvxpy as cp"
      }
    };

    expect(renderToString(<AtlasSolutionPanel {...baseProps} solution={{ status: "empty" }} />)).toContain(
      "No solve results yet."
    );
    expect(
      renderToString(<AtlasSolutionPanel {...baseProps} solution={{ status: "loading" }} />)
    ).toContain("Solving...");
    expect(renderToString(<AtlasSolutionPanel {...baseProps} solution={success} />)).toContain(
      "Objective value"
    );
    expect(
      renderToString(
        <AtlasSolutionPanel
          {...baseProps}
          solution={{ status: "error", message: "Backend down" }}
        />
      )
    ).toContain("Backend down");
    expect(
      renderToString(
        <AtlasSolutionPanel {...baseProps} solution={{ ...success, stale: true }} />
      )
    ).toContain("Solution is stale");
  });

  it("calls backend API client helpers with centralized base URLs", async () => {
    const originalFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return {
        ok: true,
        json: async () => ({ status: "ok", diagnostics: [] })
      } as Response;
    }) as typeof fetch;

    const ir = exportAtlasIR(emptyAtlasState(), { exportedAt: "2026-01-01T00:00:00.000Z" });
    await checkAtlasBackendHealth("http://backend.test");
    await validateAtlasModel(ir, "http://backend.test");
    await evaluateAtlasModel(ir, "http://backend.test");
    await generateAtlasCode(ir, "http://backend.test");
    await solveAtlasModel(ir, "http://backend.test");

    globalThis.fetch = originalFetch;
    expect(calls).toEqual([
      "http://backend.test/health",
      "http://backend.test/validate",
      "http://backend.test/evaluate",
      "http://backend.test/generate_code",
      "http://backend.test/solve"
    ]);
  });
});

describe("Atlas search and commands", () => {
  it("searches cards by title, type, tags, and property names", () => {
    const state = createProductionPlanningExample();

    expect(searchAtlasCards(state.cards, "product").map((result) => result.card.id)).toEqual(
      expect.arrayContaining(["product-alpha", "product-beta", "product-gamma"])
    );
    expect(searchAtlasCards(state.cards, "factory=A").map((result) => result.card.id)).toEqual([
      "product-alpha",
      "product-beta",
      "product-gamma"
    ]);
    expect(searchAtlasCards(state.cards, "machine_hours_per_unit")).toHaveLength(3);
    expect(searchAtlasCards(state.cards, "objective").some((result) => result.card.id === "objective-profit")).toBe(true);
  });

  it("registers and filters command palette actions", () => {
    const commands = createAtlasCommands([getAtlasCardTemplate("product-like-object")!]);

    expect(commands.map((command) => command.id)).toEqual(
      expect.arrayContaining([
        "create:object",
        "create:decision",
        "create:data",
        "create:function",
        "create:constraint",
        "create:objective",
        "template:product-like-object",
        "loadExample",
        "saveProject",
        "export",
        "evaluate",
        "solve"
      ])
    );
    expect(filterAtlasCommands(commands, "solve").map((command) => command.id)).toContain("solve");
    expect(filterAtlasCommands(commands, "product").map((command) => command.id)).toContain(
      "template:product-like-object"
    );
  });
});
