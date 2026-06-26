"""Pydantic models for raw Atlas IR exported by the GUI."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


CardType = Literal["object", "decision", "data", "function", "constraint", "objective"]
PropertyKind = Literal["constant", "formula", "decision_ref", "data_ref"]
ExpressionKind = Literal["literal", "property_ref", "multiply", "add", "function_ref"]
FunctionKind = Literal["tagged_sum"]
ObjectiveDirection = Literal["minimize", "maximize"]
ConstraintOperator = Literal["<=", ">=", "=", "=="]
ConstraintExpressionKind = Literal["constant", "function_ref"]


class AtlasBaseModel(BaseModel):
    """Base model that accepts frontend camel-case fields without losing extras."""

    model_config = ConfigDict(extra="allow", populate_by_name=True)


class PositionIR(AtlasBaseModel):
    """Optional frontend layout position."""

    x: float = 0
    y: float = 0


class SizeIR(AtlasBaseModel):
    """Optional frontend layout size."""

    width: float = 0
    height: float = 0


class TagIR(AtlasBaseModel):
    """Raw typed tag attached to a card."""

    id: str = Field(min_length=1)
    key: str = Field(min_length=1)
    value: str = ""


class PropertyIR(AtlasBaseModel):
    """Raw card property from the GUI."""

    id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    kind: PropertyKind = "constant"
    value: str | int | float | bool | dict[str, Any] | None = None
    indexSetId: str | None = None
    unit: str | None = None
    notes: str | None = None


class TagConditionIR(AtlasBaseModel):
    """Tag condition used by query include/exclude lists."""

    id: str = Field(min_length=1)
    key: str = Field(min_length=1)
    value: str = ""


class QueryIR(AtlasBaseModel):
    """Raw card query using typed-tag include/exclude conditions."""

    id: str = Field(min_length=1)
    name: str = "Query"
    includeTags: list[TagConditionIR] = Field(default_factory=list)
    excludeTags: list[TagConditionIR] = Field(default_factory=list)


class ExpressionIR(AtlasBaseModel):
    """Raw expression tree for prototype function expressions."""

    kind: ExpressionKind
    value: str | int | float | None = None
    queryId: str | None = None
    propertyName: str | None = None
    functionCardId: str | None = None
    left: "ExpressionIR | None" = None
    right: "ExpressionIR | None" = None
    terms: list["ExpressionIR"] = Field(default_factory=list)


class FunctionConfigIR(AtlasBaseModel):
    """Raw Function-card configuration, initially TaggedSum."""

    kind: FunctionKind = "tagged_sum"
    queryId: str | None = None
    expression: ExpressionIR | None = None
    displayName: str = "TaggedSum"
    description: str | None = None


class ObjectiveTermIR(AtlasBaseModel):
    """Raw objective term referencing a Function card."""

    id: str = Field(min_length=1)
    name: str = "Objective term"
    functionCardId: str | None = None


class ObjectiveIR(AtlasBaseModel):
    """Raw Objective-card configuration."""

    direction: ObjectiveDirection = "minimize"
    terms: list[ObjectiveTermIR] = Field(default_factory=list)


class ConstraintExpressionIR(AtlasBaseModel):
    """Raw constraint-side expression."""

    kind: ConstraintExpressionKind
    value: float | int | None = None
    functionCardId: str | None = None


class ConstraintIR(AtlasBaseModel):
    """Raw Constraint-card configuration."""

    name: str = "Constraint"
    left: ConstraintExpressionIR = Field(default_factory=lambda: ConstraintExpressionIR(kind="constant", value=0))
    operator: ConstraintOperator = "<="
    right: ConstraintExpressionIR = Field(default_factory=lambda: ConstraintExpressionIR(kind="constant", value=0))


class DecisionIR(AtlasBaseModel):
    """Decision variable metadata stored on Decision cards."""

    variableType: Literal["continuous", "integer", "binary"] = "continuous"
    shape: Literal["scalar"] = "scalar"
    lowerBound: float | None = None
    upperBound: float | None = None
    initialValue: float | None = None


class CsvDataIR(AtlasBaseModel):
    """Small CSV metadata and preview stored on Data cards."""

    fileName: str = "data.csv"
    columns: list[str] = Field(default_factory=list)
    rowCount: int = 0
    previewRows: list[dict[str, str]] = Field(default_factory=list)
    indexSet: dict[str, Any] | None = None


class ModuleIR(AtlasBaseModel):
    """Placeholder for future living-card modules."""

    id: str = Field(min_length=1)
    kind: str = Field(min_length=1)
    config: dict[str, Any] = Field(default_factory=dict)


class DiagnosticIR(AtlasBaseModel):
    """Serializable diagnostic shape shared with frontend results."""

    level: Literal["info", "warning", "error"] = "info"
    message: str = Field(min_length=1)
    sourceId: str | None = None


class CardIR(AtlasBaseModel):
    """Raw card record from the Atlas workbench."""

    id: str = Field(min_length=1)
    type: CardType
    title: str = "Card"
    position: PositionIR | None = None
    tags: list[TagIR] = Field(default_factory=list)
    properties: list[PropertyIR] = Field(default_factory=list)
    notes: str = ""
    functionKind: FunctionKind | None = None
    taggedSum: FunctionConfigIR | None = None
    objective: ObjectiveIR | None = None
    constraint: ConstraintIR | None = None
    decision: DecisionIR | None = None
    data: CsvDataIR | None = None
    modules: list[ModuleIR] = Field(default_factory=list)


class GroupIR(AtlasBaseModel):
    """Raw visual grouping region from the workbench."""

    id: str = Field(min_length=1)
    title: str = "Group"
    position: PositionIR | None = None
    size: SizeIR | None = None
    color: str | None = None
    notes: str = ""


class MetadataIR(AtlasBaseModel):
    """Top-level Atlas IR metadata."""

    name: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    source: str | None = "atlas-gui"


class AtlasIR(AtlasBaseModel):
    """Top-level raw Atlas IR document."""

    schemaVersion: str = "0.1"
    metadata: MetadataIR = Field(default_factory=MetadataIR)
    cards: list[CardIR] = Field(default_factory=list)
    queries: list[QueryIR] = Field(default_factory=list)
    groups: list[GroupIR] = Field(default_factory=list)
    diagnostics: list[DiagnosticIR] = Field(default_factory=list)


ExpressionIR.model_rebuild()
