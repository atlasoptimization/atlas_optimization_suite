import { EMPTY_ATLAS_STATE } from "../core/cards";
import {
  ATLAS_CARD_TYPES,
  ATLAS_FUNCTION_KINDS,
  ATLAS_PROPERTY_KINDS,
  type AtlasCard,
  type AtlasCardType,
  type AtlasCardQuery,
  type AtlasConstraintExpression,
  type AtlasConstraintOperator,
  type AtlasExpression,
  type AtlasFunctionKind,
  type AtlasCardModuleKind,
  type AtlasGroup,
  type AtlasPropertyKind,
  type AtlasWorkbenchState
} from "../core/types";
import { createTaggedSumConfig } from "../core/functions";
import { createConstraintConfig } from "../core/constraints";
import { createObjectiveConfig, createObjectiveTerm } from "../core/objectives";

const STORAGE_KEY = "atlas.optimization.workbench.v0";

export function loadAtlasWorkbenchState(): AtlasWorkbenchState {
  if (typeof localStorage === "undefined") return EMPTY_ATLAS_STATE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_ATLAS_STATE;
    return normalizeAtlasState(JSON.parse(raw));
  } catch {
    return EMPTY_ATLAS_STATE;
  }
}

export function saveAtlasWorkbenchState(state: AtlasWorkbenchState) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function normalizeAtlasState(value: unknown): AtlasWorkbenchState {
  if (!isRecord(value) || !Array.isArray(value.cards)) return EMPTY_ATLAS_STATE;

  const cards = value.cards
    .map(normalizeAtlasCard)
    .filter((card): card is AtlasCard => card !== null);
  const groups = Array.isArray(value.groups)
    ? value.groups
        .map(normalizeAtlasGroup)
        .filter((group): group is AtlasGroup => group !== null)
    : [];
  const queries = Array.isArray(value.queries)
    ? value.queries
        .map(normalizeAtlasQuery)
        .filter((query): query is AtlasCardQuery => query !== null)
    : [];
  const selectedCardId =
    typeof value.selectedCardId === "string" &&
    cards.some((card) => card.id === value.selectedCardId)
      ? value.selectedCardId
      : null;
  const selectedGroupId =
    selectedCardId === null &&
    typeof value.selectedGroupId === "string" &&
    groups.some((group) => group.id === value.selectedGroupId)
      ? value.selectedGroupId
      : null;
  const selectedQueryId =
    selectedCardId === null &&
    selectedGroupId === null &&
    typeof value.selectedQueryId === "string" &&
    queries.some((query) => query.id === value.selectedQueryId)
      ? value.selectedQueryId
      : null;

  return { cards, groups, queries, selectedCardId, selectedGroupId, selectedQueryId };
}

function normalizeAtlasCard(value: unknown): AtlasCard | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  const cardType = isAtlasCardType(value.type) ? value.type : null;
  if (!id || !cardType) return null;

  const rawPosition = isRecord(value.position) ? value.position : {};

  const baseCard: AtlasCard = {
    id,
    type: cardType,
    title: typeof value.title === "string" ? value.title : cardType,
    position: {
      x: numberField(rawPosition.x),
      y: numberField(rawPosition.y)
    },
    tags: Array.isArray(value.tags)
      ? value.tags
          .filter(isRecord)
          .map((tag, index) => ({
            id: typeof tag.id === "string" ? tag.id : `tag_${id}_${index}`,
            key: typeof tag.key === "string" ? tag.key : "",
            value: typeof tag.value === "string" ? tag.value : ""
          }))
          .filter((tag) => tag.key.trim())
      : [],
    properties: Array.isArray(value.properties)
      ? value.properties
          .filter(isRecord)
          .map((property, index) => ({
            id: typeof property.id === "string" ? property.id : `prop_${id}_${index}`,
            name: typeof property.name === "string" ? property.name : "",
            kind: isAtlasPropertyKind(property.kind) ? property.kind : "constant",
            value: normalizePropertyValue(property.value),
            indexSetId:
              typeof property.indexSetId === "string" && property.indexSetId.trim()
                ? property.indexSetId.trim()
                : undefined,
            unit: typeof property.unit === "string" && property.unit.trim()
              ? property.unit.trim()
              : undefined,
            notes: typeof property.notes === "string" && property.notes.trim()
              ? property.notes.trim()
              : undefined
          }))
          .filter((property) => property.name.trim())
      : [],
    notes: typeof value.notes === "string" ? value.notes : ""
  };
  baseCard.modules = Array.isArray(value.modules)
    ? value.modules.filter(isRecord).map(normalizeModule).filter((module) => module !== null)
    : [];
  if (cardType === "decision") {
    baseCard.decision = normalizeDecisionMetadata(value.decision);
  }
  if (cardType === "data") {
    baseCard.data = normalizeCsvData(value.data);
  }

  if (cardType === "objective") {
    const objective = isRecord(value.objective)
      ? createObjectiveConfig({
          direction: value.objective.direction === "maximize" ? "maximize" : "minimize",
          terms: Array.isArray(value.objective.terms)
            ? value.objective.terms
                .filter(isRecord)
                .map((term, index) =>
                  createObjectiveTerm(
                    typeof term.functionCardId === "string" ? term.functionCardId : null,
                    {
                      id: typeof term.id === "string" ? term.id : `term_${id}_${index}`,
                      name: typeof term.name === "string" ? term.name : `Term ${index + 1}`
                    }
                  )
                )
            : []
        })
      : createObjectiveConfig();

    return { ...baseCard, objective };
  }

  if (cardType === "constraint") {
    const constraint = isRecord(value.constraint)
      ? createConstraintConfig({
          name: typeof value.constraint.name === "string" ? value.constraint.name : "Constraint",
          left: normalizeConstraintExpression(value.constraint.left),
          operator: isConstraintOperator(value.constraint.operator)
            ? value.constraint.operator
            : "<=",
          right: normalizeConstraintExpression(value.constraint.right)
        })
      : createConstraintConfig();

    return { ...baseCard, constraint };
  }

  if (cardType !== "function") return baseCard;

  const functionKind = isAtlasFunctionKind(value.functionKind) ? value.functionKind : "tagged_sum";
  const taggedSum = isRecord(value.taggedSum)
    ? createTaggedSumConfig({
        queryId: typeof value.taggedSum.queryId === "string" ? value.taggedSum.queryId : null,
        expression: normalizeAtlasExpression(value.taggedSum.expression),
        displayName:
          typeof value.taggedSum.displayName === "string"
            ? value.taggedSum.displayName
            : "TaggedSum",
        description:
          typeof value.taggedSum.description === "string"
            ? value.taggedSum.description
            : undefined
      })
    : createTaggedSumConfig();

  return {
    ...baseCard,
    functionKind,
    taggedSum
  };
}

function normalizeAtlasGroup(value: unknown): AtlasGroup | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) return null;

  const rawPosition = isRecord(value.position) ? value.position : {};
  const rawSize = isRecord(value.size) ? value.size : {};

  return {
    id,
    title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "Group",
    position: {
      x: numberField(rawPosition.x),
      y: numberField(rawPosition.y)
    },
    size: {
      width: Math.max(180, numberField(rawSize.width, 720)),
      height: Math.max(120, numberField(rawSize.height, 420))
    },
    color: typeof value.color === "string" && value.color.trim() ? value.color.trim() : undefined,
    notes: typeof value.notes === "string" ? value.notes : ""
  };
}

function normalizeModule(value: Record<string, unknown>) {
  const kind = isModuleKind(value.kind) ? value.kind : null;
  const label = typeof value.label === "string" ? value.label.trim() : "";
  if (!kind || !label) return null;
  const rawPosition = isRecord(value.position) ? value.position : {};
  return {
    id: typeof value.id === "string" ? value.id : `module_${Math.random().toString(36).slice(2, 9)}`,
    kind,
    label,
    value: typeof value.value === "string" ? value.value : String(value.value ?? ""),
    unit: typeof value.unit === "string" && value.unit.trim() ? value.unit.trim() : undefined,
    notes: typeof value.notes === "string" && value.notes.trim() ? value.notes : undefined,
    position: {
      x: numberField(rawPosition.x, 12),
      y: numberField(rawPosition.y, 12)
    }
  };
}

function normalizeAtlasQuery(value: unknown): AtlasCardQuery | null {
  if (!isRecord(value)) return null;
  const id = typeof value.id === "string" ? value.id : "";
  if (!id) return null;

  return {
    id,
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Query",
    includeTags: normalizeConditions(value.includeTags, id, "include"),
    excludeTags: normalizeConditions(value.excludeTags, id, "exclude")
  };
}

function normalizeConditions(value: unknown, queryId: string, prefix: string) {
  return Array.isArray(value)
    ? value
        .filter(isRecord)
        .map((condition, index) => ({
          id: typeof condition.id === "string" ? condition.id : `${prefix}_${queryId}_${index}`,
          key: typeof condition.key === "string" ? condition.key : "",
          value: typeof condition.value === "string" ? condition.value : ""
        }))
    : [];
}

function isAtlasCardType(value: unknown): value is AtlasCardType {
  return typeof value === "string" && ATLAS_CARD_TYPES.includes(value as AtlasCardType);
}

function isAtlasPropertyKind(value: unknown): value is AtlasPropertyKind {
  return typeof value === "string" && ATLAS_PROPERTY_KINDS.includes(value as AtlasPropertyKind);
}

function isAtlasFunctionKind(value: unknown): value is AtlasFunctionKind {
  return typeof value === "string" && ATLAS_FUNCTION_KINDS.includes(value as AtlasFunctionKind);
}

function isModuleKind(value: unknown): value is AtlasCardModuleKind {
  return (
    value === "tag" ||
    value === "trait" ||
    value === "property" ||
    value === "diagnostic" ||
    value === "note"
  );
}

function isConstraintOperator(value: unknown): value is AtlasConstraintOperator {
  return value === "<=" || value === ">=" || value === "=" || value === "==";
}

function normalizeConstraintExpression(value: unknown): AtlasConstraintExpression | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") return undefined;

  if (value.kind === "constant") {
    return {
      kind: "constant",
      value: numberField(value.value)
    };
  }

  if (value.kind === "function_ref") {
    return {
      kind: "function_ref",
      functionCardId: typeof value.functionCardId === "string" ? value.functionCardId : null
    };
  }

  return undefined;
}

function normalizeAtlasExpression(value: unknown): AtlasExpression | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;

  if (value.kind === "literal") {
    return typeof value.value === "string" || typeof value.value === "number"
      ? { kind: "literal", value: value.value }
      : null;
  }

  if (value.kind === "property_ref") {
    return typeof value.queryId === "string" && typeof value.propertyName === "string"
      ? {
          kind: "property_ref",
          queryId: value.queryId,
          propertyName: value.propertyName
        }
      : null;
  }

  if (value.kind === "multiply") {
    const left = normalizeAtlasExpression(value.left);
    const right = normalizeAtlasExpression(value.right);
    return left && right ? { kind: "multiply", left, right } : null;
  }

  if (value.kind === "add" && Array.isArray(value.terms)) {
    const terms = value.terms
      .map(normalizeAtlasExpression)
      .filter((term): term is AtlasExpression => term !== null);
    return { kind: "add", terms };
  }

  return null;
}

function normalizePropertyValue(value: unknown) {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  if (isRecord(value) && typeof value.dataCardId === "string" && typeof value.column === "string") {
    return {
      dataCardId: value.dataCardId,
      column: value.column,
      rowIndex: typeof value.rowIndex === "number" ? value.rowIndex : undefined
    };
  }

  return null;
}

function normalizeDecisionMetadata(value: unknown) {
  const record = isRecord(value) ? value : {};
  const variableType: "continuous" | "integer" | "binary" =
    record.variableType === "integer" || record.variableType === "binary"
      ? record.variableType
      : "continuous";
  return {
    variableType,
    shape: "scalar" as const,
    lowerBound: nullableNumber(record.lowerBound),
    upperBound: nullableNumber(record.upperBound),
    initialValue: nullableNumber(record.initialValue)
  };
}

function normalizeCsvData(value: unknown) {
  if (!isRecord(value)) return undefined;
  const columns = Array.isArray(value.columns)
    ? value.columns.filter((column): column is string => typeof column === "string")
    : [];
  return {
    fileName: typeof value.fileName === "string" ? value.fileName : "data.csv",
    columns,
    rowCount: numberField(value.rowCount),
    previewRows: Array.isArray(value.previewRows)
      ? value.previewRows.filter(isRecord).map((row) =>
          Object.fromEntries(
            Object.entries(row).map(([key, entry]) => [key, String(entry ?? "")])
          )
        )
      : [],
    indexSet: normalizeIndexSet(value.indexSet)
  };
}

function normalizeIndexSet(value: unknown) {
  if (!isRecord(value)) return undefined;
  const elements = Array.isArray(value.elements)
    ? value.elements.map((element) => String(element).trim()).filter(Boolean)
    : [];
  return {
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : "Index set",
    elements
  };
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberField(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
