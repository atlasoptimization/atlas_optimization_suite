import type { AtlasCardType, AtlasProperty, AtlasTag } from "./types";

export type AtlasCardTemplate = {
  id: string;
  name: string;
  cardType: AtlasCardType;
  defaultTags: Array<Omit<AtlasTag, "id">>;
  defaultProperties: Array<Omit<AtlasProperty, "id">>;
  description: string;
};

export const ATLAS_CARD_TEMPLATES: AtlasCardTemplate[] = [
  {
    id: "generic-object",
    name: "Generic Object",
    cardType: "object",
    defaultTags: [{ key: "type", value: "object" }],
    defaultProperties: [],
    description: "A generic modeling object with no predefined properties."
  },
  {
    id: "generic-decision",
    name: "Generic Decision",
    cardType: "decision",
    defaultTags: [{ key: "type", value: "decision" }],
    defaultProperties: [],
    description: "A placeholder for a future decision variable or choice."
  },
  {
    id: "generic-data-source",
    name: "Generic Data Source",
    cardType: "data",
    defaultTags: [{ key: "type", value: "data" }],
    defaultProperties: [],
    description: "A generic data source or input reference."
  },
  {
    id: "generic-function",
    name: "Generic Function",
    cardType: "function",
    defaultTags: [{ key: "type", value: "function" }],
    defaultProperties: [],
    description: "A generic function card to configure later."
  },
  {
    id: "generic-constraint",
    name: "Generic Constraint",
    cardType: "constraint",
    defaultTags: [{ key: "type", value: "constraint" }],
    defaultProperties: [],
    description: "A generic constraint shell with no expression configured yet."
  },
  {
    id: "generic-objective",
    name: "Generic Objective",
    cardType: "objective",
    defaultTags: [{ key: "type", value: "objective" }],
    defaultProperties: [],
    description: "A generic objective shell with no terms configured yet."
  },
  {
    id: "product-like-object",
    name: "Product-like Object",
    cardType: "object",
    defaultTags: [
      { key: "type", value: "product" },
      { key: "status", value: "active" }
    ],
    defaultProperties: [
      { name: "unit_cost", kind: "constant", value: "" },
      { name: "demand", kind: "constant", value: "" },
      { name: "production_quantity", kind: "decision_ref", value: "" },
      { name: "machine_hours_per_unit", kind: "constant", value: "" }
    ],
    description:
      "An example object template with common planning properties. It is only a starter shape, not a domain engine."
  }
];

export function getAtlasCardTemplate(templateId: string) {
  return ATLAS_CARD_TEMPLATES.find((template) => template.id === templateId) ?? null;
}
