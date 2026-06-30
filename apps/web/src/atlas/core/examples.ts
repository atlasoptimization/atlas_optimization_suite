import type { AtlasWorkbenchState } from "./types";

export function createProductionPlanningExample(): AtlasWorkbenchState {
  return {
    cards: [
      product("product-alpha", "Product Alpha", 260, 180, 8, 2, "decision-alpha"),
      product("product-beta", "Product Beta", 260, 380, 12, 3, "decision-beta"),
      product("product-gamma", "Product Gamma", 260, 580, 15, 5, "decision-gamma"),
      decision("decision-alpha", "Alpha production", 560, 180),
      decision("decision-beta", "Beta production", 560, 380),
      decision("decision-gamma", "Gamma production", 560, 580),
      {
        id: "function-profit",
        type: "function",
        functionKind: "tagged_sum",
        taggedSum: {
          queryId: "query-products-factory-a",
          displayName: "Total profit",
          description: "Sum unit profit times production quantity across Factory A products.",
          expression: {
            kind: "multiply",
            left: {
              kind: "property_ref",
              queryId: "query-products-factory-a",
              propertyName: "unit_profit"
            },
            right: {
              kind: "property_ref",
              queryId: "query-products-factory-a",
              propertyName: "production_quantity"
            }
          }
        },
        title: "Total profit",
        position: { x: 900, y: 220 },
        tags: [{ id: "tag-function-profit", key: "role", value: "profit" }],
        properties: [],
        notes: "TaggedSum over product profit contributions."
      },
      {
        id: "function-machine-hours",
        type: "function",
        functionKind: "tagged_sum",
        taggedSum: {
          queryId: "query-products-factory-a",
          displayName: "Machine hours used",
          description: "Sum required machine hours across production quantities.",
          expression: {
            kind: "multiply",
            left: {
              kind: "property_ref",
              queryId: "query-products-factory-a",
              propertyName: "machine_hours_per_unit"
            },
            right: {
              kind: "property_ref",
              queryId: "query-products-factory-a",
              propertyName: "production_quantity"
            }
          }
        },
        title: "Machine hours used",
        position: { x: 900, y: 430 },
        tags: [{ id: "tag-function-hours", key: "role", value: "capacity" }],
        properties: [],
        notes: "TaggedSum over machine-hour consumption."
      },
      {
        id: "objective-profit",
        type: "objective",
        objective: {
          direction: "maximize",
          terms: [{ id: "term-profit", name: "Total profit", functionCardId: "function-profit" }]
        },
        title: "Maximize profit",
        position: { x: 1220, y: 260 },
        tags: [],
        properties: [],
        notes: "Primary objective for the example."
      },
      {
        id: "constraint-capacity",
        type: "constraint",
        constraint: {
          name: "Factory A machine capacity",
          left: { kind: "function_ref", functionCardId: "function-machine-hours" },
          operator: "<=",
          right: { kind: "constant", value: 40 }
        },
        title: "Machine capacity",
        position: { x: 1220, y: 470 },
        tags: [],
        properties: [],
        notes: "Factory A has 40 available machine hours."
      }
    ],
    connections: [],
    groups: [
      {
        id: "group-factory-a",
        title: "Factory A",
        position: { x: 210, y: 130 },
        size: { width: 660, height: 650 },
        color: "#4dabf7",
        notes: "Visual grouping only; query semantics come from typed tags."
      }
    ],
    queries: [
      {
        id: "query-products-factory-a",
        name: "Factory A products",
        includeTags: [
          { id: "cond-type-product", key: "type", value: "product" },
          { id: "cond-factory-a", key: "factory", value: "A" }
        ],
        excludeTags: []
      }
    ],
    selectedCardId: "objective-profit",
    selectedGroupId: null,
    selectedQueryId: null
  };
}

function product(
  id: string,
  title: string,
  x: number,
  y: number,
  unitProfit: number,
  machineHours: number,
  decisionId: string
) {
  return {
    id,
    type: "object" as const,
    title,
    position: { x, y },
    tags: [
      { id: `${id}-tag-type`, key: "type", value: "product" },
      { id: `${id}-tag-factory`, key: "factory", value: "A" }
    ],
    properties: [
      { id: `${id}-unit-profit`, name: "unit_profit", kind: "constant" as const, value: unitProfit },
      {
        id: `${id}-machine-hours`,
        name: "machine_hours_per_unit",
        kind: "constant" as const,
        value: machineHours
      },
      {
        id: `${id}-production-quantity`,
        name: "production_quantity",
        kind: "decision_ref" as const,
        value: decisionId
      }
    ],
    notes: "Example product object with typed tags and decision-backed quantity."
  };
}

function decision(id: string, title: string, x: number, y: number) {
  return {
    id,
    type: "decision" as const,
    title,
    position: { x, y },
    tags: [{ id: `${id}-tag-kind`, key: "kind", value: "production_quantity" }],
    properties: [],
    notes: "Continuous nonnegative scalar decision variable in the first solver slice."
  };
}
