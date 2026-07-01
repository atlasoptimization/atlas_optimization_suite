import type {
  AtlasCard,
  AtlasAtomInput,
  AtlasCardType,
  AtlasPosition,
  AtlasProperty,
  AtlasPropertyKind,
  AtlasTag,
  AtlasWorkbenchState
} from "./types";
import { createTaggedSumConfig } from "./functions";
import { createConstraintConfig } from "./constraints";
import { createObjectiveConfig } from "./objectives";
import { getAtlasCardTemplate } from "./templates";
import { atlasShapeLabel } from "./modelDefinitions";

export const EMPTY_ATLAS_STATE: AtlasWorkbenchState = {
  cards: [],
  groups: [],
  queries: [],
  connections: [],
  selectedCardId: null,
  selectedGroupId: null,
  selectedQueryId: null,
  selectedConnectionId: null,
  settings: {
    defaultBackend: "local-fastapi",
    defaultSolver: "CLARABEL",
    autoValidate: false,
    showAdvancedCvxpy: false,
    numberFormat: "compact",
    showDiagnosticsOnCanvas: true
  }
};

const DEFAULT_CARD_TITLES: Record<AtlasCardType, string> = {
  object: "Object",
  decision: "Decision",
  data: "Data",
  function: "Function",
  constraint: "Constraint",
  objective: "Objective"
};

const MODEL_KIND_CARD_TYPE: Record<string, AtlasCardType> = {
  variable: "decision",
  parameter: "data",
  constant: "object",
  atom: "function",
  expression: "function",
  constraint: "constraint",
  objective: "objective",
  problem: "object"
};

export function createAtlasCard(
  cardType: AtlasCardType,
  options: { id?: string; index?: number; position?: AtlasPosition } = {}
): AtlasCard {
  const index = options.index ?? 0;
  const functionDefaults =
    cardType === "function"
      ? {
          functionKind: "tagged_sum" as const,
          taggedSum: createTaggedSumConfig()
        }
      : {};
  const objectiveDefaults =
    cardType === "objective" ? { objective: createObjectiveConfig() } : {};
  const constraintDefaults =
    cardType === "constraint" ? { constraint: createConstraintConfig() } : {};
  const decisionDefaults =
    cardType === "decision"
      ? {
          decision: {
            variableType: "continuous" as const,
            shape: "scalar" as const,
            lowerBound: 0
          }
        }
      : {};

  return {
    id: options.id ?? makeAtlasId("card"),
    type: cardType,
    ...functionDefaults,
    ...objectiveDefaults,
    ...constraintDefaults,
    ...decisionDefaults,
    title: DEFAULT_CARD_TITLES[cardType],
    position: options.position ?? {
      x: 760 + (index % 4) * 260,
      y: 660 + Math.floor(index / 4) * 180
    },
    tags: [],
    properties: [],
    notes: ""
  };
}

export function defineAtlasModelObject(
  state: AtlasWorkbenchState,
  objectKind: NonNullable<AtlasCard["modelObjectKind"]>,
  name: string,
  shape: unknown = "scalar",
  atomSpec?: AtlasCard["atomSpec"],
  position?: AtlasPosition,
  attributes: Record<string, boolean> = {},
  value?: unknown,
  notes?: string
): AtlasWorkbenchState {
  const cardType = MODEL_KIND_CARD_TYPE[objectKind] ?? "object";
  const modelObjectId = makeAtlasId(objectKind);
  const card = createAtlasCard(cardType, {
    id: `node_${modelObjectId}`,
    index: state.cards.length,
    position
  });
  const title = name.trim() || defaultModelObjectName(objectKind);
  const definition: AtlasCard = {
    ...card,
    title,
    modelObjectId,
    modelObjectKind: objectKind,
    modelObjectShape: shape,
    modelObjectValue: objectKind === "constant" || objectKind === "parameter" ? value : undefined,
    workspaceRole: "definition",
    atomSpec,
    atomConfig: objectKind === "atom" ? createAtomConfig(atomSpec, title) : undefined,
    decision: objectKind === "variable"
      ? {
          variableType: attributes.boolean ? "binary" : attributes.integer ? "integer" : "continuous",
          shape: shapeModeForDecision(shape),
          attributes
        }
      : card.decision,
    notes: notes?.trim() || `${atlasShapeLabel(shape)} ${objectKind}`
  };

  return {
    ...state,
    cards: [...state.cards, definition],
    selectedCardId: definition.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function getWorkspaceCards(state: AtlasWorkbenchState): AtlasCard[] {
  return state.cards.filter((card) => card.workspaceRole !== "definition");
}

export function createAtlasWorkspaceReference(
  state: AtlasWorkbenchState,
  modelObjectId: string,
  position?: AtlasPosition
): AtlasWorkbenchState {
  const canonical = getCanonicalModelObjects(state).find((object) => object.modelObjectId === modelObjectId);
  if (!canonical) return state;
  const canonicalKind = canonical.modelObjectKind ?? cardTypeToModelKind(canonical.type);
  const cardType = MODEL_KIND_CARD_TYPE[canonicalKind] ?? "object";
  const reference = createAtlasCard(cardType, {
    id: makeAtlasId("node"),
    index: state.cards.length,
    position: position ?? {
      x: canonical.position.x + 280,
      y: canonical.position.y
    }
  });
  const referenceCard: AtlasCard = {
    ...reference,
    title: canonical.title,
    modelObjectId: canonical.modelObjectId,
    modelObjectKind: canonicalKind,
    workspaceRole: "reference",
    tags: canonical.tags.map((tag) => ({ ...tag })),
    properties: canonical.properties.map((property) => ({ ...property })),
    decision: canonical.decision ? { ...canonical.decision } : undefined,
    data: canonical.data ? JSON.parse(JSON.stringify(canonical.data)) : undefined,
    functionKind: canonical.functionKind,
    atomSpec: canonical.atomSpec ? JSON.parse(JSON.stringify(canonical.atomSpec)) : undefined,
    atomConfig: canonical.atomConfig ? JSON.parse(JSON.stringify(canonical.atomConfig)) : undefined,
    taggedSum: canonical.taggedSum ? JSON.parse(JSON.stringify(canonical.taggedSum)) : undefined,
    objective: canonical.objective ? JSON.parse(JSON.stringify(canonical.objective)) : undefined,
    constraint: canonical.constraint ? JSON.parse(JSON.stringify(canonical.constraint)) : undefined,
    notes: `Workspace reference to ${canonical.title}`
  };

  return {
    ...state,
    cards: [...state.cards, referenceCard],
    selectedCardId: referenceCard.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function duplicateAtlasWorkspaceReference(
  state: AtlasWorkbenchState,
  cardId: string,
  position?: AtlasPosition
): AtlasWorkbenchState {
  const card = state.cards.find((candidate) => candidate.id === cardId);
  const modelObjectId = card?.modelObjectId ?? card?.id;
  return modelObjectId ? createAtlasWorkspaceReference(state, modelObjectId, position) : state;
}

export function deleteAtlasCanonicalObject(
  state: AtlasWorkbenchState,
  modelObjectId: string
): AtlasWorkbenchState {
  const remainingCards = state.cards.filter((card) => (card.modelObjectId ?? card.id) !== modelObjectId);
  const remainingCardIds = new Set(remainingCards.map((card) => card.id));
  return {
    ...state,
    cards: remainingCards,
    connections: state.connections.filter(
      (connection) =>
        (!connection.source.objectId || connection.source.objectId !== modelObjectId) &&
        (!connection.target.objectId || connection.target.objectId !== modelObjectId) &&
        (!connection.source.nodeId || remainingCardIds.has(connection.source.nodeId)) &&
        (!connection.target.nodeId || remainingCardIds.has(connection.target.nodeId))
    ),
    selectedCardId:
      state.selectedCardId && remainingCardIds.has(state.selectedCardId) ? state.selectedCardId : null,
    selectedConnectionId: null
  };
}

export function clearAtlasDesk(state: AtlasWorkbenchState): AtlasWorkbenchState {
  const definitionCards = state.cards.filter((card) => card.workspaceRole === "definition");
  const definitionCardIds = new Set(definitionCards.map((card) => card.id));
  return {
    ...state,
    cards: definitionCards,
    groups: [],
    connections: [],
    selectedCardId:
      state.selectedCardId && definitionCardIds.has(state.selectedCardId) ? state.selectedCardId : null,
    selectedGroupId: null,
    selectedConnectionId: null
  };
}

export function renameAtlasCanonicalObject(
  state: AtlasWorkbenchState,
  modelObjectId: string,
  title: string
): AtlasWorkbenchState {
  const trimmed = title.trim();
  if (!trimmed) return state;
  return {
    ...state,
    cards: state.cards.map((card) =>
      (card.modelObjectId ?? card.id) === modelObjectId ? { ...card, title: trimmed } : card
    )
  };
}

export function updateAtlasAtomInput(
  state: AtlasWorkbenchState,
  cardId: string,
  inputKind: "positional" | "keyword",
  inputId: string,
  patch: Partial<AtlasAtomInput>
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) => {
      if (card.id !== cardId) return card;
      if (!card.atomConfig) return card;
      if (inputKind === "positional") {
        return {
          ...card,
          atomConfig: {
            ...card.atomConfig,
            positionalInputs: card.atomConfig.positionalInputs.map((input) =>
              input.id === inputId ? { ...input, ...patch } : input
            )
          }
        };
      }
      return {
        ...card,
        atomConfig: {
          ...card.atomConfig,
          keywordInputs: Object.fromEntries(
            Object.entries(card.atomConfig.keywordInputs).map(([name, input]) => [
              name,
              input.id === inputId || name === inputId ? { ...input, ...patch } : input
            ])
          )
        }
      };
    })
  };
}

export function getCanonicalModelObjects(state: AtlasWorkbenchState): AtlasCard[] {
  const seen = new Set<string>();
  const canonical: AtlasCard[] = [];
  for (const card of state.cards) {
    const modelObjectId = card.modelObjectId ?? card.id;
    if (seen.has(modelObjectId)) continue;
    seen.add(modelObjectId);
    canonical.push({
      ...card,
      modelObjectId,
      modelObjectKind: card.modelObjectKind ?? cardTypeToModelKind(card.type),
      workspaceRole: card.workspaceRole ?? "definition"
    });
  }
  return canonical;
}

export function addAtlasCard(
  state: AtlasWorkbenchState,
  cardType: AtlasCardType,
  id?: string
): AtlasWorkbenchState {
  const card = createAtlasCard(cardType, { id, index: state.cards.length });

  return {
    ...state,
    cards: [...state.cards, card],
    selectedCardId: card.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function addAtlasCardFromTemplate(
  state: AtlasWorkbenchState,
  templateId: string
): AtlasWorkbenchState {
  const template = getAtlasCardTemplate(templateId);
  if (!template) return state;

  const card = createAtlasCard(template.cardType, { index: state.cards.length });
  const templatedCard: AtlasCard = {
    ...card,
    title: template.name,
    tags: template.defaultTags.map((tag) => createAtlasTag(tag.key, tag.value)),
    properties: template.defaultProperties.map((property) =>
      createAtlasProperty(property.name, property.kind, property.value, {
        indexSetId: property.indexSetId,
        unit: property.unit,
        notes: property.notes
      })
    )
  };

  return {
    ...state,
    cards: [...state.cards, templatedCard],
    selectedCardId: templatedCard.id,
    selectedGroupId: null,
    selectedQueryId: null
  };
}

export function moveAtlasCard(
  state: AtlasWorkbenchState,
  cardId: string,
  position: AtlasPosition
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, position } : card
    )
  };
}

export function updateAtlasCardDetails(
  state: AtlasWorkbenchState,
  cardId: string,
  patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">>
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            title: patch.title !== undefined ? patch.title.trim() || card.title : card.title,
            notes: patch.notes !== undefined ? patch.notes : card.notes,
            decision: patch.decision !== undefined ? patch.decision : card.decision,
            data: patch.data !== undefined ? patch.data : card.data
          }
        : card
    )
  };
}

export function deleteAtlasCard(state: AtlasWorkbenchState, cardId: string): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.filter((card) => card.id !== cardId),
    connections: (state.connections ?? []).filter(
      (connection) => connection.source.nodeId !== cardId && connection.target.nodeId !== cardId
    ),
    selectedCardId: state.selectedCardId === cardId ? null : state.selectedCardId,
    selectedConnectionId: null
  };
}

export function getSelectedAtlasCard(state: AtlasWorkbenchState) {
  return state.cards.find((card) => card.id === state.selectedCardId) ?? null;
}

export function createAtlasTag(key: string, value: string, id = makeAtlasId("tag")): AtlasTag {
  const trimmedKey = key.trim();
  if (!trimmedKey) throw new Error("Tag key is required.");

  return {
    id,
    key: trimmedKey,
    value: value.trim()
  };
}

export function addAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  key: string,
  value: string,
  id?: string
): AtlasWorkbenchState {
  const tag = createAtlasTag(key, value, id);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, tags: [...card.tags, tag] } : card
    )
  };
}

export function updateAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  tagId: string,
  key: string,
  value: string
): AtlasWorkbenchState {
  const nextTag = createAtlasTag(key, value, tagId);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            tags: card.tags.map((tag) => (tag.id === tagId ? nextTag : tag))
          }
        : card
    )
  };
}

export function deleteAtlasTag(
  state: AtlasWorkbenchState,
  cardId: string,
  tagId: string
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, tags: card.tags.filter((tag) => tag.id !== tagId) }
        : card
    )
  };
}

export function createAtlasProperty(
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { id?: string; indexSetId?: string; unit?: string; notes?: string } = {}
): AtlasProperty {
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Property name is required.");
  const unit = optionalText(options.unit);
  const notes = optionalText(options.notes);

  return {
    id: options.id ?? makeAtlasId("prop"),
    name: trimmedName,
    kind,
    value,
    ...(options.indexSetId ? { indexSetId: options.indexSetId } : {}),
    ...(unit ? { unit } : {}),
    ...(notes ? { notes } : {})
  };
}

export function addAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { id?: string; indexSetId?: string; unit?: string; notes?: string } = {}
): AtlasWorkbenchState {
  const property = createAtlasProperty(name, kind, value, options);

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, properties: [...card.properties, property] }
        : card
    )
  };
}

export function updateAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  propertyId: string,
  name: string,
  kind: AtlasPropertyKind,
  value: AtlasProperty["value"],
  options: { indexSetId?: string; unit?: string; notes?: string } = {}
): AtlasWorkbenchState {
  const nextProperty = createAtlasProperty(name, kind, value, {
    ...options,
    id: propertyId
  });

  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            properties: card.properties.map((property) =>
              property.id === propertyId ? nextProperty : property
            )
          }
        : card
    )
  };
}

export function deleteAtlasProperty(
  state: AtlasWorkbenchState,
  cardId: string,
  propertyId: string
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            properties: card.properties.filter((property) => property.id !== propertyId)
          }
        : card
    )
  };
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function cardTypeToModelKind(cardType: AtlasCardType): NonNullable<AtlasCard["modelObjectKind"]> {
  if (cardType === "decision") return "variable";
  if (cardType === "data") return "parameter";
  if (cardType === "object") return "constant";
  if (cardType === "function") return "atom";
  return cardType;
}

function defaultModelObjectName(kind: string) {
  if (kind === "variable") return "x";
  if (kind === "parameter") return "p";
  if (kind === "constant") return "c";
  if (kind === "atom") return "atom";
  return kind;
}

function shapeModeForDecision(shape: unknown): "scalar" | "vector" | "matrix" | "custom" {
  if (shape === "scalar" || shape === undefined || shape === null) return "scalar";
  if (shape === "vector") return "vector";
  if (shape === "matrix") return "matrix";
  if (typeof shape === "number") return "vector";
  if (Array.isArray(shape) && shape.length === 2) return "matrix";
  return "custom";
}

function createAtomConfig(atomSpec: AtlasCard["atomSpec"], fallbackName: string): AtlasCard["atomConfig"] {
  const atomName = atomSpec?.name ?? fallbackName;
  const defaultValues = atomSpec?.defaultValues ?? {};
  const argumentSpecs = atomSpec?.arguments?.length
    ? atomSpec.arguments
    : (atomSpec?.argumentNames?.length ? atomSpec.argumentNames : ["arg0", "arg1"]).map((name) => ({ name }));
  const positionalInputs: AtlasAtomInput[] = [];
  const keywordInputs: Record<string, AtlasAtomInput> = {};
  for (const argument of argumentSpecs) {
    const name = argument.name;
    if (name in defaultValues) {
      keywordInputs[name] = {
        id: `kw_${name}`,
        name,
        kind: "literal",
        value: parseAtomDefault(defaultValues[name])
      };
    } else {
      positionalInputs.push({
        id: `arg_${positionalInputs.length}`,
        name,
        kind: "reference"
      });
    }
  }
  return {
    symbolId: atomSpec?.symbolId,
    atomName,
    importPath: atomSpec?.importPath ?? `cvxpy.${atomName}`,
    displayName: atomSpec?.displayName ?? atomSpec?.name ?? fallbackName,
    signature: atomSpec?.signature ?? "(*args)",
    positionalInputs,
    keywordInputs,
    outputName: "expression",
    metadata: atomSpec ? JSON.parse(JSON.stringify(atomSpec)) : undefined,
    uiOverrides: atomSpec?.uiOverrides ? JSON.parse(JSON.stringify(atomSpec.uiOverrides)) : undefined
  };
}

function parseAtomDefault(value: string | undefined) {
  if (value === undefined) return null;
  if (value === "None") return null;
  if (value === "True") return true;
  if (value === "False") return false;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  return value.replace(/^['"]|['"]$/g, "");
}

function makeAtlasId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
