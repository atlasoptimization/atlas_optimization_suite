"""Pydantic models for raw Atlas IR exported by the GUI."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


CardType = Literal["object", "decision", "data", "function", "constraint", "objective"]
PropertyKind = Literal["constant", "formula", "decision_ref", "data_ref"]
ExpressionKind = Literal["literal", "property_ref", "multiply", "add", "function_ref"]
FunctionKind = Literal["tagged_sum"]
ObjectiveDirection = Literal["minimize", "maximize"]
ConstraintOperator = Literal["<=", ">=", "=", "=="]
ConstraintExpressionKind = Literal["constant", "function_ref"]
ModelObjectKind = Literal[
    "variable",
    "parameter",
    "constant",
    "atom",
    "expression",
    "constraint",
    "objective",
    "problem",
    "solver",
    "result",
    "workspace_reference",
]


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


class ModelObjectBaseIR(AtlasBaseModel):
    """Canonical mathematical object independent from visual workspace placement."""

    id: str = Field(min_length=1)
    kind: ModelObjectKind
    name: str = Field(default="Object", min_length=1)
    notes: str | None = None
    sourceCardId: str | None = None


class VariableObjectIR(ModelObjectBaseIR):
    """Canonical CVXPY variable object."""

    kind: Literal["variable"] = "variable"
    decision: DecisionIR | None = None


class ParameterObjectIR(ModelObjectBaseIR):
    """Canonical CVXPY parameter/input object."""

    kind: Literal["parameter"] = "parameter"
    data: dict[str, Any] | None = None


class ConstantObjectIR(ModelObjectBaseIR):
    """Canonical CVXPY constant object."""

    kind: Literal["constant"] = "constant"
    value: Any | None = None
    properties: list[PropertyIR] = Field(default_factory=list)


class AtomObjectIR(ModelObjectBaseIR):
    """Canonical CVXPY atom/expression-call object."""

    kind: Literal["atom"] = "atom"
    atomId: str | None = None
    atomName: str | None = None
    importPath: str | None = None
    displayName: str | None = None
    positionalInputs: list[dict[str, Any]] = Field(default_factory=list)
    keywordInputs: dict[str, dict[str, Any]] = Field(default_factory=dict)
    outputName: str | None = None
    metadata: dict[str, Any] | None = None
    uiOverrides: dict[str, Any] | None = None
    atomSpec: dict[str, Any] | None = None
    taggedSum: FunctionConfigIR | None = None


class ExpressionObjectIR(ModelObjectBaseIR):
    """Canonical expression object."""

    kind: Literal["expression"] = "expression"
    expression: dict[str, Any] | None = None


class ConstraintObjectIR(ModelObjectBaseIR):
    """Canonical constraint object."""

    kind: Literal["constraint"] = "constraint"
    constraint: ConstraintIR | None = None


class ObjectiveObjectIR(ModelObjectBaseIR):
    """Canonical objective object."""

    kind: Literal["objective"] = "objective"
    objective: ObjectiveIR | None = None


class ProblemObjectIR(ModelObjectBaseIR):
    """Canonical CVXPY problem object."""

    kind: Literal["problem"] = "problem"
    objectiveIds: list[str] = Field(default_factory=list)
    constraintIds: list[str] = Field(default_factory=list)


class SolverObjectIR(ModelObjectBaseIR):
    """Canonical solver configuration object."""

    kind: Literal["solver"] = "solver"
    solverName: str | None = None
    options: dict[str, Any] = Field(default_factory=dict)


class ResultObjectIR(ModelObjectBaseIR):
    """Canonical result object."""

    kind: Literal["result"] = "result"
    status: str | None = None
    value: Any | None = None


class WorkspaceReferenceObjectIR(ModelObjectBaseIR):
    """Canonical reference object that points at another canonical object."""

    kind: Literal["workspace_reference"] = "workspace_reference"
    targetObjectId: str = Field(min_length=1)
    targetObjectKind: ModelObjectKind


class ModelObjectsIR(AtlasBaseModel):
    """Canonical model-object registry grouped by kind."""

    variables: list[VariableObjectIR] = Field(default_factory=list)
    parameters: list[ParameterObjectIR] = Field(default_factory=list)
    constants: list[ConstantObjectIR] = Field(default_factory=list)
    atoms: list[AtomObjectIR] = Field(default_factory=list)
    expressions: list[ExpressionObjectIR] = Field(default_factory=list)
    constraints: list[ConstraintObjectIR] = Field(default_factory=list)
    objectives: list[ObjectiveObjectIR] = Field(default_factory=list)
    problems: list[ProblemObjectIR] = Field(default_factory=list)
    solvers: list[SolverObjectIR] = Field(default_factory=list)
    results: list[ResultObjectIR] = Field(default_factory=list)
    workspaceReferences: list[WorkspaceReferenceObjectIR] = Field(default_factory=list)

    def all_objects(self) -> list[ModelObjectBaseIR]:
        """Return all canonical objects in deterministic registry order."""

        return [
            *self.variables,
            *self.parameters,
            *self.constants,
            *self.atoms,
            *self.expressions,
            *self.constraints,
            *self.objectives,
            *self.problems,
            *self.solvers,
            *self.results,
            *self.workspaceReferences,
        ]


class WorkspaceNodeIR(AtlasBaseModel):
    """Visual placement of a canonical model object."""

    id: str = Field(min_length=1)
    modelObjectId: str = Field(min_length=1)
    modelObjectKind: ModelObjectKind
    position: PositionIR = Field(default_factory=PositionIR)
    size: SizeIR | None = None
    displayState: dict[str, Any] = Field(default_factory=dict)
    style: dict[str, Any] | None = None
    expanded: bool | None = None
    collapsed: bool | None = None


class ConnectionEndpointIR(AtlasBaseModel):
    """Endpoint for a visual or semantic connection."""

    nodeId: str | None = None
    objectId: str | None = None
    port: str | None = None
    slot: str | None = None


class ConnectionIR(AtlasBaseModel):
    """Connection between workspace nodes or canonical model objects."""

    id: str = Field(min_length=1)
    source: ConnectionEndpointIR
    target: ConnectionEndpointIR
    semanticReference: dict[str, Any] | None = None


class ViewsIR(AtlasBaseModel):
    """Optional UI layout state that does not define mathematics."""

    groups: list["GroupIR"] = Field(default_factory=list)
    selectedNodeId: str | None = None


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

    schemaVersion: str = "0.2-cvxpy"
    title: str | None = None
    name: str | None = None
    createdAt: str | None = None
    updatedAt: str | None = None
    exportedAt: str | None = None
    source: str | None = "atlas-gui"


class AtlasIR(AtlasBaseModel):
    """Top-level raw Atlas IR document."""

    schemaVersion: str = "0.2-cvxpy"
    metadata: MetadataIR = Field(default_factory=MetadataIR)
    modelObjects: ModelObjectsIR = Field(default_factory=ModelObjectsIR)
    workspaceNodes: list[WorkspaceNodeIR] = Field(default_factory=list)
    connections: list[ConnectionIR] = Field(default_factory=list)
    views: ViewsIR | None = None
    future: dict[str, Any] = Field(default_factory=dict)
    cards: list[CardIR] = Field(default_factory=list)
    queries: list[QueryIR] = Field(default_factory=list)
    groups: list[GroupIR] = Field(default_factory=list)
    diagnostics: list[DiagnosticIR] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_cvxpy_first_references(self) -> "AtlasIR":
        """Validate canonical object and workspace reference integrity."""

        object_ids: set[str] = set()
        for model_object in self.modelObjects.all_objects():
            if model_object.id in object_ids:
                raise ValueError(f'Duplicate model object id "{model_object.id}".')
            object_ids.add(model_object.id)

        node_ids: set[str] = set()
        for node in self.workspaceNodes:
            if node.id in node_ids:
                raise ValueError(f'Duplicate workspace node id "{node.id}".')
            node_ids.add(node.id)
            if node.modelObjectId not in object_ids:
                raise ValueError(
                    f'Workspace node "{node.id}" references missing model object "{node.modelObjectId}".'
                )

        for connection in self.connections:
            validate_endpoint(connection.id, "source", connection.source, node_ids, object_ids)
            validate_endpoint(connection.id, "target", connection.target, node_ids, object_ids)

        return self


ExpressionIR.model_rebuild()
ViewsIR.model_rebuild()


def validate_endpoint(
    connection_id: str,
    side: str,
    endpoint: ConnectionEndpointIR,
    node_ids: set[str],
    object_ids: set[str],
) -> None:
    """Raise if a connection endpoint points at a missing node/object."""

    if not endpoint.nodeId and not endpoint.objectId:
        raise ValueError(f'Connection "{connection_id}" {side} must reference a node or model object.')
    if endpoint.nodeId and endpoint.nodeId not in node_ids:
        raise ValueError(
            f'Connection "{connection_id}" {side} references missing workspace node "{endpoint.nodeId}".'
        )
    if endpoint.objectId and endpoint.objectId not in object_ids:
        raise ValueError(
            f'Connection "{connection_id}" {side} references missing model object "{endpoint.objectId}".'
        )
