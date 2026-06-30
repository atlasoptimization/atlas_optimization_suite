export const ATLAS_CARD_TYPES = [
  "object",
  "decision",
  "data",
  "function",
  "constraint",
  "objective"
] as const;

export type AtlasCardType = (typeof ATLAS_CARD_TYPES)[number];

export type AtlasPosition = {
  x: number;
  y: number;
};

export type AtlasSize = {
  width: number;
  height: number;
};

export type AtlasTag = {
  id: string;
  key: string;
  value: string;
};

export const ATLAS_PROPERTY_KINDS = [
  "constant",
  "formula",
  "decision_ref",
  "data_ref"
] as const;

export type AtlasPropertyKind = (typeof ATLAS_PROPERTY_KINDS)[number];

export type AtlasProperty = {
  id: string;
  name: string;
  kind: AtlasPropertyKind;
  value: string | number | boolean | AtlasDataReference | null;
  indexSetId?: string;
  unit?: string;
  notes?: string;
};

export type AtlasDecisionMetadata = {
  variableType: "continuous" | "integer" | "binary";
  shape: "scalar";
  lowerBound?: number | null;
  upperBound?: number | null;
  initialValue?: number | null;
};

export type AtlasAtomMetadata = {
  name: string;
  importPath: string;
  displayName?: string | null;
  signature: string;
  argumentNames: string[];
  defaultValues?: Record<string, string>;
  doc?: string;
  category?: string;
  module?: string;
  callable?: boolean;
  uiOverrides?: Record<string, unknown> | null;
};

export type AtlasAtomInput = {
  id: string;
  name: string;
  kind: "reference" | "literal";
  objectId?: string;
  nodeId?: string;
  value?: string | number | boolean | null;
};

export type AtlasAtomConfig = {
  atomName: string;
  importPath: string;
  displayName: string;
  signature: string;
  positionalInputs: AtlasAtomInput[];
  keywordInputs: Record<string, AtlasAtomInput>;
  outputName?: string;
  metadata?: Record<string, unknown>;
  uiOverrides?: Record<string, unknown>;
};

export type AtlasDataReference = {
  dataCardId: string;
  column: string;
  rowIndex?: number;
};

export type AtlasCsvData = {
  fileName: string;
  columns: string[];
  rowCount: number;
  previewRows: Record<string, string>[];
  indexSet?: AtlasIndexSet;
};

export type AtlasIndexSet = {
  name: string;
  elements: string[];
};

export const ATLAS_FUNCTION_KINDS = ["tagged_sum"] as const;

export type AtlasFunctionKind = (typeof ATLAS_FUNCTION_KINDS)[number];

export type AtlasCard = {
  id: string;
  type: AtlasCardType;
  modelObjectId?: string;
  modelObjectKind?:
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
  modelObjectShape?: unknown;
  modelObjectValue?: unknown;
  workspaceRole?: "definition" | "reference";
  functionKind?: AtlasFunctionKind;
  atomSpec?: AtlasAtomMetadata;
  atomConfig?: AtlasAtomConfig;
  taggedSum?: AtlasTaggedSumConfig;
  objective?: AtlasObjectiveConfig;
  constraint?: AtlasConstraintConfig;
  decision?: AtlasDecisionMetadata;
  data?: AtlasCsvData;
  modules?: AtlasCardModule[];
  title: string;
  position: AtlasPosition;
  tags: AtlasTag[];
  properties: AtlasProperty[];
  notes: string;
};

export type AtlasCardModuleKind = "tag" | "trait" | "property" | "diagnostic" | "note";

export type AtlasCardModule = {
  id: string;
  kind: AtlasCardModuleKind;
  label: string;
  value: string;
  unit?: string;
  notes?: string;
  position?: AtlasPosition;
};

export type AtlasGroup = {
  id: string;
  title: string;
  position: AtlasPosition;
  size: AtlasSize;
  color?: string;
  notes: string;
};

export type AtlasTagCondition = {
  id: string;
  key: string;
  value: string;
};

export type AtlasCardQuery = {
  id: string;
  name: string;
  includeTags: AtlasTagCondition[];
  excludeTags: AtlasTagCondition[];
};

export type AtlasExpression =
  | { kind: "literal"; value: string | number }
  | { kind: "property_ref"; queryId: string; propertyName: string }
  | { kind: "multiply"; left: AtlasExpression; right: AtlasExpression }
  | { kind: "add"; terms: AtlasExpression[] };

export type AtlasTaggedSumConfig = {
  queryId: string | null;
  expression: AtlasExpression | null;
  displayName: string;
  description?: string;
};

export type AtlasOptimizationDirection = "minimize" | "maximize";

export type AtlasObjectiveTerm = {
  id: string;
  name: string;
  functionCardId: string | null;
};

export type AtlasObjectiveConfig = {
  direction: AtlasOptimizationDirection;
  terms: AtlasObjectiveTerm[];
};

export type AtlasConstraintExpression =
  | { kind: "constant"; value: number }
  | { kind: "function_ref"; functionCardId: string | null };

export type AtlasConstraintOperator = "<=" | ">=" | "=" | "==";

export type AtlasConstraintConfig = {
  name: string;
  left: AtlasConstraintExpression;
  operator: AtlasConstraintOperator;
  right: AtlasConstraintExpression;
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

export type AtlasWorkbenchState = {
  cards: AtlasCard[];
  groups: AtlasGroup[];
  queries: AtlasCardQuery[];
  connections: AtlasConnection[];
  selectedCardId: string | null;
  selectedGroupId: string | null;
  selectedQueryId: string | null;
};

export type AtlasAction =
  | { type: "card.create"; cardType: AtlasCardType }
  | { type: "card.createFromTemplate"; templateId: string }
  | { type: "modelObject.define"; objectKind: "variable" | "parameter" | "constant" | "atom" | "constraint" | "objective" | "problem"; name: string; shape?: "scalar" | "vector" | "matrix"; atomSpec?: AtlasAtomMetadata; position?: AtlasPosition }
  | { type: "workspaceReference.create"; modelObjectId: string; position?: AtlasPosition }
  | { type: "workspaceReference.duplicate"; cardId: string; position?: AtlasPosition }
  | { type: "modelObject.delete"; modelObjectId: string }
  | { type: "modelObject.rename"; modelObjectId: string; title: string }
  | { type: "connection.create"; source: AtlasConnectionEndpoint; target: AtlasConnectionEndpoint; semanticKind?: string }
  | { type: "connection.delete"; connectionId: string }
  | { type: "card.select"; cardId: string | null }
  | { type: "card.update"; cardId: string; patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">> }
  | { type: "atom.input.update"; cardId: string; inputKind: "positional" | "keyword"; inputId: string; patch: Partial<AtlasAtomInput> }
  | { type: "card.move"; cardId: string; position: AtlasPosition }
  | { type: "card.delete"; cardId: string }
  | { type: "group.create" }
  | { type: "group.select"; groupId: string | null }
  | {
      type: "group.update";
      groupId: string;
      patch: Partial<Pick<AtlasGroup, "title" | "position" | "size" | "color" | "notes">>;
    }
  | { type: "group.delete"; groupId: string }
  | { type: "query.create" }
  | { type: "query.select"; queryId: string | null }
  | { type: "query.update"; queryId: string; patch: Partial<Pick<AtlasCardQuery, "name">> }
  | { type: "query.duplicate"; queryId: string }
  | { type: "query.delete"; queryId: string }
  | {
      type: "query.condition.add";
      queryId: string;
      list: "includeTags" | "excludeTags";
      key: string;
      value: string;
    }
  | {
      type: "query.condition.update";
      queryId: string;
      list: "includeTags" | "excludeTags";
      conditionId: string;
      key: string;
      value: string;
    }
  | {
      type: "query.condition.delete";
      queryId: string;
      list: "includeTags" | "excludeTags";
      conditionId: string;
    }
  | { type: "tag.add"; cardId: string; key: string; value: string }
  | { type: "tag.update"; cardId: string; tagId: string; key: string; value: string }
  | { type: "tag.delete"; cardId: string; tagId: string }
  | {
      type: "property.add";
      cardId: string;
      name: string;
      kind: AtlasPropertyKind;
      value: AtlasProperty["value"];
      indexSetId?: string;
      unit?: string;
      notes?: string;
    }
  | {
      type: "property.update";
      cardId: string;
      propertyId: string;
      name: string;
      kind: AtlasPropertyKind;
      value: AtlasProperty["value"];
      indexSetId?: string;
      unit?: string;
      notes?: string;
    }
  | { type: "property.delete"; cardId: string; propertyId: string }
  | {
      type: "module.attach";
      cardId: string;
      kind: AtlasCardModuleKind;
      label?: string;
      value?: string;
      position?: AtlasPosition;
    }
  | {
      type: "module.update";
      cardId: string;
      moduleId: string;
      patch: Partial<Pick<AtlasCardModule, "label" | "value" | "unit" | "notes" | "position">>;
    }
  | { type: "module.delete"; cardId: string; moduleId: string }
  | {
      type: "function.taggedSum.update";
      cardId: string;
      patch: Partial<AtlasTaggedSumConfig>;
    }
  | {
      type: "objective.update";
      cardId: string;
      patch: Partial<Pick<AtlasObjectiveConfig, "direction">>;
    }
  | { type: "objective.term.add"; cardId: string; functionCardId?: string | null }
  | { type: "objective.term.update"; cardId: string; termId: string; name: string; functionCardId: string | null }
  | { type: "objective.term.remove"; cardId: string; termId: string }
  | { type: "objective.term.move"; cardId: string; termId: string; direction: "up" | "down" }
  | {
      type: "constraint.update";
      cardId: string;
      patch: Partial<AtlasConstraintConfig>;
    }
  | { type: "workbench.clear" }
  | { type: "workbench.load"; state: AtlasWorkbenchState };
