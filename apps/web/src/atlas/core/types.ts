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
  functionKind?: AtlasFunctionKind;
  taggedSum?: AtlasTaggedSumConfig;
  objective?: AtlasObjectiveConfig;
  constraint?: AtlasConstraintConfig;
  decision?: AtlasDecisionMetadata;
  data?: AtlasCsvData;
  title: string;
  position: AtlasPosition;
  tags: AtlasTag[];
  properties: AtlasProperty[];
  notes: string;
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

export type AtlasWorkbenchState = {
  cards: AtlasCard[];
  groups: AtlasGroup[];
  queries: AtlasCardQuery[];
  selectedCardId: string | null;
  selectedGroupId: string | null;
  selectedQueryId: string | null;
};

export type AtlasAction =
  | { type: "card.create"; cardType: AtlasCardType }
  | { type: "card.createFromTemplate"; templateId: string }
  | { type: "card.select"; cardId: string | null }
  | { type: "card.update"; cardId: string; patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">> }
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
