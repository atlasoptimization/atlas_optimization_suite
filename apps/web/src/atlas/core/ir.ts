import { normalizeAtlasState } from "../storage/localAtlasStorage";
import { getCanonicalModelObjects } from "./cards";
import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasConstraintConfig,
  AtlasDecisionMetadata,
  AtlasGroup,
  AtlasObjectiveConfig,
  AtlasPosition,
  AtlasSize,
  AtlasTaggedSumConfig,
  AtlasWorkbenchState
} from "./types";

export const ATLAS_IR_SCHEMA_VERSION = "0.2-cvxpy";

export type AtlasIRMetadata = {
  schemaVersion: typeof ATLAS_IR_SCHEMA_VERSION;
  source: "atlas-gui";
  title: string;
  createdAt?: string;
  updatedAt?: string;
  exportedAt: string;
};

export type AtlasModelObjectKind =
  | "variable"
  | "parameter"
  | "constant"
  | "atom"
  | "expression"
  | "constraint"
  | "objective"
  | "problem"
  | "solver"
  | "result"
  | "workspace_reference";

export type AtlasModelObjectBase = {
  id: string;
  kind: AtlasModelObjectKind;
  name: string;
  notes?: string;
  sourceCardId?: string;
};

export type AtlasVariableObject = AtlasModelObjectBase & {
  kind: "variable";
  shape?: unknown;
  decision?: AtlasDecisionMetadata;
};

export type AtlasParameterObject = AtlasModelObjectBase & {
  kind: "parameter";
  shape?: unknown;
  data?: unknown;
};

export type AtlasConstantObject = AtlasModelObjectBase & {
  kind: "constant";
  value?: unknown;
  properties?: AtlasCard["properties"];
};

export type AtlasAtomObject = AtlasModelObjectBase & {
  kind: "atom";
  atomId?: string;
  atomName: string;
  importPath: string;
  displayName: string;
  positionalInputs: AtlasCard["atomConfig"] extends infer Config
    ? Config extends { positionalInputs: infer Inputs }
      ? Inputs
      : []
    : [];
  keywordInputs: AtlasCard["atomConfig"] extends infer Config
    ? Config extends { keywordInputs: infer Inputs }
      ? Inputs
      : Record<string, never>
    : Record<string, never>;
  outputName?: string;
  metadata?: Record<string, unknown>;
  uiOverrides?: Record<string, unknown>;
  atomSpec?: AtlasCard["atomSpec"];
  taggedSum?: AtlasTaggedSumConfig;
};

export type AtlasExpressionObject = AtlasModelObjectBase & {
  kind: "expression";
  expression?: unknown;
};

export type AtlasConstraintObject = AtlasModelObjectBase & {
  kind: "constraint";
  constraint?: AtlasConstraintConfig;
};

export type AtlasObjectiveObject = AtlasModelObjectBase & {
  kind: "objective";
  objective?: AtlasObjectiveConfig;
};

export type AtlasProblemObject = AtlasModelObjectBase & {
  kind: "problem";
  objectiveIds: string[];
  constraintIds: string[];
};

export type AtlasSolverObject = AtlasModelObjectBase & {
  kind: "solver";
  solverName?: string | null;
  options?: Record<string, unknown>;
};

export type AtlasResultObject = AtlasModelObjectBase & {
  kind: "result";
  status?: string;
  value?: unknown;
};

export type AtlasWorkspaceReferenceObject = AtlasModelObjectBase & {
  kind: "workspace_reference";
  targetObjectId: string;
  targetObjectKind: AtlasModelObjectKind;
};

export type AtlasModelObject =
  | AtlasVariableObject
  | AtlasParameterObject
  | AtlasConstantObject
  | AtlasAtomObject
  | AtlasExpressionObject
  | AtlasConstraintObject
  | AtlasObjectiveObject
  | AtlasProblemObject
  | AtlasSolverObject
  | AtlasResultObject
  | AtlasWorkspaceReferenceObject;

export type AtlasModelObjects = {
  variables: AtlasVariableObject[];
  parameters: AtlasParameterObject[];
  constants: AtlasConstantObject[];
  atoms: AtlasAtomObject[];
  expressions: AtlasExpressionObject[];
  constraints: AtlasConstraintObject[];
  objectives: AtlasObjectiveObject[];
  problems: AtlasProblemObject[];
  solvers: AtlasSolverObject[];
  results: AtlasResultObject[];
  workspaceReferences: AtlasWorkspaceReferenceObject[];
};

export type AtlasWorkspaceNode = {
  id: string;
  modelObjectId: string;
  modelObjectKind: AtlasModelObjectKind;
  position: AtlasPosition;
  size?: AtlasSize;
  displayState: {
    title?: string;
    collapsed?: boolean;
    expanded?: boolean;
    selectedTab?: string;
    [key: string]: unknown;
  };
  style?: Record<string, unknown>;
  expanded?: boolean;
  collapsed?: boolean;
};

export type AtlasConnectionEndpoint = {
  nodeId?: string;
  objectId?: string;
  port?: string;
  slot?: string;
};

export type AtlasConnection = {
  id: string;
  source: AtlasConnectionEndpoint;
  target: AtlasConnectionEndpoint;
  semanticReference?: {
    kind: string;
    objectId?: string;
    propertyName?: string;
    [key: string]: unknown;
  };
};

export type AtlasIRViews = {
  groups?: AtlasGroup[];
  selectedNodeId?: string | null;
  [key: string]: unknown;
};

export type AtlasIR = {
  schemaVersion: typeof ATLAS_IR_SCHEMA_VERSION;
  metadata: AtlasIRMetadata;
  modelObjects: AtlasModelObjects;
  workspaceNodes: AtlasWorkspaceNode[];
  connections: AtlasConnection[];
  views?: AtlasIRViews;
  future?: Record<string, unknown>;
  /** Compatibility payload for the current semantic-card evaluator/compiler. */
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  groups: AtlasGroup[];
};

export type AtlasIRImportResult = {
  state: AtlasWorkbenchState;
  diagnostics: string[];
};

export function exportAtlasIR(
  state: AtlasWorkbenchState,
  metadata: Partial<AtlasIRMetadata> = {}
): AtlasIR {
  const modelObjects = createModelObjectsFromState(state);
  return {
    schemaVersion: ATLAS_IR_SCHEMA_VERSION,
    metadata: {
      schemaVersion: ATLAS_IR_SCHEMA_VERSION,
      source: "atlas-gui",
      title: metadata.title ?? "Untitled Atlas CVXPY workspace",
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      exportedAt: metadata.exportedAt ?? new Date().toISOString()
    },
    modelObjects,
    workspaceNodes: state.cards.map((card) => cardToWorkspaceNode(card)),
    connections: [
      ...(state.connections ?? []).map((connection) => copyJson(connection)),
      ...createConnectionsFromState(state)
    ],
    views: {
      groups: state.groups.map((group) => ({
        ...group,
        position: { ...group.position },
        size: { ...group.size }
      }))
    },
    future: {},
    cards: state.cards.map(copyCardForIR),
    queries: state.queries.map((query) => ({
      ...query,
      includeTags: query.includeTags.map((condition) => ({ ...condition })),
      excludeTags: query.excludeTags.map((condition) => ({ ...condition }))
    })),
    groups: state.groups.map((group) => ({
      ...group,
      position: { ...group.position },
      size: { ...group.size }
    }))
  };
}

export function serializeAtlasIR(ir: AtlasIR) {
  return JSON.stringify(ir, null, 2);
}

export function importAtlasIR(value: unknown): AtlasIRImportResult {
  const diagnostics = validateAtlasIR(value);
  if (diagnostics.length > 0) {
    return { state: normalizeAtlasState({ cards: [] }), diagnostics };
  }

  const ir = value as AtlasIR;
  const cards = Array.isArray(ir.cards) && ir.cards.length > 0
    ? ir.cards
    : cardsFromWorkspaceIR(ir);
  return {
    state: normalizeAtlasState({
      cards,
      queries: ir.queries ?? [],
      groups: ir.groups ?? ir.views?.groups ?? [],
      connections: Array.isArray(ir.connections) ? ir.connections.map((connection) => copyJson(connection)) : [],
      selectedCardId: null,
      selectedGroupId: null,
      selectedQueryId: null
    }),
    diagnostics: []
  };
}

export function validateAtlasIR(value: unknown): string[] {
  const diagnostics: string[] = [];
  if (!isRecord(value)) return ["Atlas IR must be a JSON object."];
  if (value.schemaVersion !== ATLAS_IR_SCHEMA_VERSION) {
    const legacyVersion = value.schemaVersion === "0.1";
    if (!legacyVersion) {
      diagnostics.push(`Unsupported Atlas IR schemaVersion "${String(value.schemaVersion)}".`);
    }
  }
  const hasCvxpyFirstShape = isRecord(value.modelObjects) && Array.isArray(value.workspaceNodes);
  const hasLegacyShape = Array.isArray(value.cards);
  if (!hasCvxpyFirstShape && !hasLegacyShape) {
    diagnostics.push("Atlas IR must include modelObjects/workspaceNodes or legacy cards.");
  }
  if ("queries" in value && !Array.isArray(value.queries)) diagnostics.push("Atlas IR queries must be an array.");
  if ("groups" in value && !Array.isArray(value.groups)) diagnostics.push("Atlas IR groups must be an array.");

  if (Array.isArray(value.cards)) {
    for (const [index, card] of value.cards.entries()) {
      if (!isRecord(card) || typeof card.id !== "string" || !card.id.trim()) {
        diagnostics.push(`Card at index ${index} is missing required id.`);
      }
      if (!isRecord(card) || typeof card.type !== "string" || !card.type.trim()) {
        diagnostics.push(`Card at index ${index} is missing required type.`);
      }
    }
  }
  if (hasCvxpyFirstShape) diagnostics.push(...validateCvxpyFirstIR(value as Partial<AtlasIR>));

  return diagnostics;
}

export function validateCvxpyFirstIR(ir: Partial<AtlasIR>): string[] {
  const diagnostics: string[] = [];
  const modelObjects = isRecord(ir.modelObjects) ? ir.modelObjects as Partial<AtlasModelObjects> : {};
  const allObjects = flattenModelObjects(modelObjects);
  const objectIds = new Set<string>();
  for (const object of allObjects) {
    if (!object.id.trim()) diagnostics.push("Model object is missing required id.");
    if (objectIds.has(object.id)) diagnostics.push(`Duplicate model object id "${object.id}".`);
    objectIds.add(object.id);
  }

  const nodeIds = new Set<string>();
  for (const node of ir.workspaceNodes ?? []) {
    if (!node.id.trim()) diagnostics.push("Workspace node is missing required id.");
    if (nodeIds.has(node.id)) diagnostics.push(`Duplicate workspace node id "${node.id}".`);
    nodeIds.add(node.id);
    if (!objectIds.has(node.modelObjectId)) {
      diagnostics.push(`Workspace node "${node.id}" references missing model object "${node.modelObjectId}".`);
    }
  }

  for (const connection of ir.connections ?? []) {
    validateConnectionEndpoint(connection.id, "source", connection.source, nodeIds, objectIds, diagnostics);
    validateConnectionEndpoint(connection.id, "target", connection.target, nodeIds, objectIds, diagnostics);
  }

  return diagnostics;
}

export function addWorkspaceReferenceToIR(
  ir: AtlasIR,
  reference: Omit<AtlasWorkspaceNode, "id"> & { id?: string }
): AtlasIR {
  const node: AtlasWorkspaceNode = {
    ...reference,
    id: reference.id ?? `node-${reference.modelObjectId}-${ir.workspaceNodes.length + 1}`,
    position: { ...reference.position },
    size: reference.size ? { ...reference.size } : undefined,
    displayState: { ...reference.displayState },
    style: reference.style ? { ...reference.style } : undefined
  };
  return {
    ...ir,
    workspaceNodes: [...ir.workspaceNodes, node]
  };
}

export function deleteWorkspaceNodeFromIR(ir: AtlasIR, nodeId: string): AtlasIR {
  return {
    ...ir,
    workspaceNodes: ir.workspaceNodes.filter((node) => node.id !== nodeId),
    connections: ir.connections.filter(
      (connection) => connection.source.nodeId !== nodeId && connection.target.nodeId !== nodeId
    )
  };
}

function createModelObjectsFromState(state: AtlasWorkbenchState): AtlasModelObjects {
  const objects = emptyModelObjects();
  for (const card of getCanonicalModelObjects(state)) {
    const objectId = card.modelObjectId ?? card.id;
    const kind = card.modelObjectKind ?? cardTypeToModelObjectKind(card.type);
    if (kind === "variable") {
      objects.variables.push({
        id: objectId,
        kind: "variable",
        name: card.title,
        shape: card.modelObjectShape,
        notes: card.notes,
        sourceCardId: card.id,
        decision: copyJson(card.decision ?? { variableType: "continuous", shape: "scalar" })
      });
    } else if (kind === "parameter") {
      objects.parameters.push({
        id: objectId,
        kind: "parameter",
        name: card.title,
        shape: card.modelObjectShape,
        notes: card.notes,
        sourceCardId: card.id,
        data: copyJson(card.data ?? null)
      });
    } else if (kind === "constant") {
      objects.constants.push({
        id: objectId,
        kind: "constant",
        name: card.title,
        value: card.modelObjectValue,
        notes: card.notes,
        sourceCardId: card.id,
        properties: card.properties.map((property) => ({ ...property }))
      });
    } else if (kind === "atom" || kind === "expression") {
      objects.atoms.push({
        id: objectId,
        kind: "atom",
        name: card.title,
        notes: card.notes,
        sourceCardId: card.id,
        atomId: card.atomConfig?.importPath ?? card.atomSpec?.importPath ?? (card.functionKind ? `atlas.compat.${card.functionKind}` : undefined),
        atomName: card.atomConfig?.atomName ?? card.atomSpec?.name ?? card.title,
        importPath: card.atomConfig?.importPath ?? card.atomSpec?.importPath ?? `cvxpy.${card.atomSpec?.name ?? card.title}`,
        displayName: card.atomConfig?.displayName ?? card.atomSpec?.name ?? card.title,
        positionalInputs: card.atomConfig ? copyJson(card.atomConfig.positionalInputs) : [],
        keywordInputs: card.atomConfig ? copyJson(card.atomConfig.keywordInputs) : {},
        outputName: card.atomConfig?.outputName,
        metadata: card.atomConfig?.metadata ? copyJson(card.atomConfig.metadata) : undefined,
        uiOverrides: card.atomConfig?.uiOverrides ? copyJson(card.atomConfig.uiOverrides) : undefined,
        atomSpec: card.atomSpec ? copyJson(card.atomSpec) : undefined,
        taggedSum: card.taggedSum ? copyJson(card.taggedSum) : undefined
      });
    } else if (kind === "constraint") {
      objects.constraints.push({
        id: objectId,
        kind: "constraint",
        name: card.constraint?.name ?? card.title,
        notes: card.notes,
        sourceCardId: card.id,
        constraint: card.constraint ? copyJson(card.constraint) : undefined
      });
    } else if (kind === "objective") {
      objects.objectives.push({
        id: objectId,
        kind: "objective",
        name: card.title,
        notes: card.notes,
        sourceCardId: card.id,
        objective: card.objective ? copyJson(card.objective) : undefined
      });
    }
  }
  const objectiveIds = objects.objectives.map((objective) => objective.id);
  const constraintIds = objects.constraints.map((constraint) => constraint.id);
  if (objectiveIds.length > 0 || constraintIds.length > 0) {
    objects.problems.push({
      id: "problem-main",
      kind: "problem",
      name: "Main problem",
      objectiveIds,
      constraintIds
    });
  }
  return objects;
}

function cardToWorkspaceNode(card: AtlasCard): AtlasWorkspaceNode {
  return {
    id: card.id,
    modelObjectId: card.modelObjectId ?? card.id,
    modelObjectKind: card.modelObjectKind ?? cardTypeToModelObjectKind(card.type),
    position: { ...card.position },
    displayState: {
      title: card.title,
      cardType: card.type,
      workspaceRole: card.workspaceRole ?? "definition",
      collapsed: false
    }
  };
}

function createConnectionsFromState(state: AtlasWorkbenchState): AtlasConnection[] {
  const connections: AtlasConnection[] = [];
  const cardIds = new Set(state.cards.map((card) => card.id));
  for (const card of state.cards) {
    if (card.type === "objective" && card.objective) {
      for (const term of card.objective.terms) {
        if (!term.functionCardId || !cardIds.has(term.functionCardId)) continue;
        connections.push({
          id: `connection-${card.id}-${term.id}`,
          source: { objectId: term.functionCardId },
          target: { objectId: card.id, slot: term.id },
          semanticReference: { kind: "objective_term", objectId: term.functionCardId }
        });
      }
    }
    if (card.type === "constraint" && card.constraint) {
      for (const side of ["left", "right"] as const) {
        const expression = card.constraint[side];
        if (
          expression.kind !== "function_ref" ||
          !expression.functionCardId ||
          !cardIds.has(expression.functionCardId)
        ) continue;
        connections.push({
          id: `connection-${card.id}-${side}`,
          source: { objectId: expression.functionCardId },
          target: { objectId: card.id, slot: side },
          semanticReference: { kind: "constraint_side", objectId: expression.functionCardId, side }
        });
      }
    }
  }
  return connections;
}

function cardsFromWorkspaceIR(ir: AtlasIR): AtlasCard[] {
  const objects = new Map(flattenModelObjects(ir.modelObjects).map((object) => [object.id, object]));
  return ir.workspaceNodes.flatMap((node) => {
    const object = objects.get(node.modelObjectId);
    if (!object) return [];
    return [modelObjectToCard(object, node)];
  });
}

function modelObjectToCard(object: AtlasModelObject, node: AtlasWorkspaceNode): AtlasCard {
  const type = modelObjectKindToCardType(object.kind);
  return {
    id: node.id,
    type,
    modelObjectId: object.id,
    modelObjectKind: object.kind,
    modelObjectShape: object.kind === "variable" || object.kind === "parameter" ? object.shape : undefined,
    modelObjectValue: object.kind === "constant" ? object.value : undefined,
    workspaceRole: node.displayState.workspaceRole === "reference" ? "reference" : "definition",
    title: node.displayState.title ?? object.name,
    position: { ...node.position },
    tags: [],
    properties: object.kind === "constant" ? object.properties ?? [] : [],
    notes: object.notes ?? "",
    ...(object.kind === "variable" ? { decision: object.decision } : {}),
    ...(object.kind === "parameter" ? { data: object.data as AtlasCard["data"] } : {}),
    ...(object.kind === "atom" ? {
      functionKind: "tagged_sum" as const,
      taggedSum: object.taggedSum,
      atomSpec: object.atomSpec,
      atomConfig: {
        atomName: object.atomName,
        importPath: object.importPath,
        displayName: object.displayName,
        signature: object.atomSpec?.signature ?? "(*args)",
        positionalInputs: object.positionalInputs,
        keywordInputs: object.keywordInputs,
        outputName: object.outputName,
        metadata: object.metadata,
        uiOverrides: object.uiOverrides
      }
    } : {}),
    ...(object.kind === "objective" ? { objective: object.objective } : {}),
    ...(object.kind === "constraint" ? { constraint: object.constraint } : {})
  };
}

function emptyModelObjects(): AtlasModelObjects {
  return {
    variables: [],
    parameters: [],
    constants: [],
    atoms: [],
    expressions: [],
    constraints: [],
    objectives: [],
    problems: [],
    solvers: [],
    results: [],
    workspaceReferences: []
  };
}

function flattenModelObjects(modelObjects: Partial<AtlasModelObjects>): AtlasModelObject[] {
  return [
    ...(modelObjects.variables ?? []),
    ...(modelObjects.parameters ?? []),
    ...(modelObjects.constants ?? []),
    ...(modelObjects.atoms ?? []),
    ...(modelObjects.expressions ?? []),
    ...(modelObjects.constraints ?? []),
    ...(modelObjects.objectives ?? []),
    ...(modelObjects.problems ?? []),
    ...(modelObjects.solvers ?? []),
    ...(modelObjects.results ?? []),
    ...(modelObjects.workspaceReferences ?? [])
  ] as AtlasModelObject[];
}

function validateConnectionEndpoint(
  connectionId: string,
  side: "source" | "target",
  endpoint: AtlasConnectionEndpoint,
  nodeIds: Set<string>,
  objectIds: Set<string>,
  diagnostics: string[]
) {
  if (endpoint.nodeId && !nodeIds.has(endpoint.nodeId)) {
    diagnostics.push(`Connection "${connectionId}" ${side} references missing workspace node "${endpoint.nodeId}".`);
  }
  if (endpoint.objectId && !objectIds.has(endpoint.objectId)) {
    diagnostics.push(`Connection "${connectionId}" ${side} references missing model object "${endpoint.objectId}".`);
  }
  if (!endpoint.nodeId && !endpoint.objectId) {
    diagnostics.push(`Connection "${connectionId}" ${side} must reference a node or model object.`);
  }
}

function cardTypeToModelObjectKind(cardType: AtlasCard["type"]): AtlasModelObjectKind {
  if (cardType === "decision") return "variable";
  if (cardType === "data") return "parameter";
  if (cardType === "object") return "constant";
  if (cardType === "function") return "atom";
  return cardType;
}

function modelObjectKindToCardType(kind: AtlasModelObjectKind): AtlasCard["type"] {
  if (kind === "variable") return "decision";
  if (kind === "parameter") return "data";
  if (kind === "constant") return "object";
  if (kind === "atom" || kind === "expression") return "function";
  if (kind === "objective") return "objective";
  return "constraint";
}

function copyCardForIR(card: AtlasCard): AtlasCard {
  return {
    ...card,
    position: { ...card.position },
    tags: card.tags.map((tag) => ({ ...tag })),
    properties: card.properties.map((property) => ({ ...property })),
    ...(card.atomConfig ? { atomConfig: copyJson(card.atomConfig) } : {}),
    ...(card.taggedSum ? { taggedSum: copyJson(card.taggedSum) } : {}),
    ...(card.objective ? { objective: copyJson(card.objective) } : {}),
    ...(card.constraint ? { constraint: copyJson(card.constraint) } : {})
  };
}

function copyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
