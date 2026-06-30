import type { AtlasCard, AtlasCardType } from "./types";
import type { AtlasCardTemplate } from "./templates";

export type AtlasSearchResult = {
  card: AtlasCard;
  matches: string[];
};

export type AtlasCommandId =
  | `create:${AtlasCardType}`
  | `template:${string}`
  | "loadExample"
  | "saveProject"
  | "export"
  | "evaluate"
  | "solve";

export type AtlasCommand = {
  id: AtlasCommandId;
  label: string;
  keywords: string[];
};

const CARD_TYPE_LABELS: Record<AtlasCardType, string> = {
  object: "Constant",
  decision: "Variable",
  data: "Parameter",
  function: "Atom / Expression",
  constraint: "Constraint",
  objective: "Objective"
};

const CVXPY_FIRST_HIDDEN_TEMPLATE_IDS = new Set(["product-like-object"]);

export function searchAtlasCards(cards: AtlasCard[], query: string): AtlasSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return cards
    .map((card) => {
      const fields = cardSearchFields(card);
      const matches = fields.filter((field) => normalizeSearchText(field).includes(normalizedQuery));
      return { card, matches };
    })
    .filter((result) => result.matches.length > 0);
}

export function createAtlasCommands(templates: AtlasCardTemplate[]): AtlasCommand[] {
  const createCommands = (Object.keys(CARD_TYPE_LABELS) as AtlasCardType[]).map((cardType) => ({
    id: `create:${cardType}` as const,
    label: `Create ${CARD_TYPE_LABELS[cardType]} card`,
    keywords: ["create", "card", cardType, CARD_TYPE_LABELS[cardType]]
  }));
  const templateCommands = templates
    .filter((template) => !CVXPY_FIRST_HIDDEN_TEMPLATE_IDS.has(template.id))
    .map((template) => ({
      id: `template:${template.id}` as const,
      label: `Create from template: ${template.name}`,
      keywords: ["create", "template", template.name, template.cardType, template.description]
    }));

  return [
    ...createCommands,
    ...templateCommands,
    {
      id: "loadExample",
      label: "Load linear CVXPY example",
      keywords: ["load", "example", "linear", "cvxpy", "solve"]
    },
    { id: "saveProject", label: "Save project JSON", keywords: ["save", "project", "json"] },
    { id: "export", label: "Export Atlas IR", keywords: ["export", "ir", "json"] },
    { id: "evaluate", label: "Evaluate selected/current model", keywords: ["evaluate", "selected"] },
    { id: "solve", label: "Solve model", keywords: ["solve", "optimize"] }
  ];
}

export function filterAtlasCommands(commands: AtlasCommand[], query: string): AtlasCommand[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return commands;
  return commands.filter((command) =>
    [command.label, ...command.keywords].some((field) =>
      normalizeSearchText(field).includes(normalizedQuery)
    )
  );
}

function cardSearchFields(card: AtlasCard) {
  return [
    card.title,
    card.type,
    ...card.tags.flatMap((tag) => [tag.key, tag.value, `${tag.key}=${tag.value}`]),
    ...card.properties.map((property) => property.name)
  ];
}

function normalizeSearchText(value: string) {
  return value.trim().toLowerCase();
}
