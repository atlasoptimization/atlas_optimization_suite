"""Minimal CVXPY backend adapter for the first linear Atlas slice."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

from .constraints import Constraint
from .diagnostics import Diagnostic
from .expressions import Expression
from .functions import TaggedSumFunction

if TYPE_CHECKING:
    from .cards import AtlasCard
    from .desk import AtlasDesk


@dataclass
class CvxpyCompileResult:
    """Compiled CVXPY problem plus readable code and diagnostics."""

    problem: Any | None
    variables: dict[str, Any] = field(default_factory=dict)
    diagnostics: list[Diagnostic] = field(default_factory=list)
    code: str = ""


@dataclass
class CvxpySolveResult:
    """Serializable solve result."""

    status: str
    objective_value: float | None
    variable_values: dict[str, float | None]
    diagnostics: list[Diagnostic]
    code: str
    constraint_values: dict[str, dict[str, Any]] = field(default_factory=dict)


def generate_cvxpy_code(desk: "AtlasDesk") -> str:
    """Generate readable CVXPY-oriented code for the supported linear subset."""

    lines = ["import cvxpy as cp", ""]
    for decision in desk.find_cards_by_type("decision"):
        lines.append(f'{variable_name(decision.id)} = {variable_code(decision)}')
    if desk.objectives:
        objective_id, objective = next(iter(desk.objectives.items()))
        lines.append(f"# Objective {objective_id}")
        lines.append(f"objective = cp.{objective.direction.capitalize()}({objective.symbolic(desk)})")
    else:
        lines.append("objective = cp.Minimize(0)")
    lines.append("constraints = [")
    for constraint_id, constraint in desk.constraints.items():
        lines.append(f"    # {constraint_id}: {constraint.symbolic(desk)}")
    lines.append("]")
    lines.append("problem = cp.Problem(objective, constraints)")
    lines.append("problem.solve()")
    return "\n".join(lines)


def compile_problem(desk: "AtlasDesk") -> CvxpyCompileResult:
    """Compile supported Atlas objects into a CVXPY problem."""

    try:
        import cvxpy as cp
    except ModuleNotFoundError:
        return CvxpyCompileResult(
            None,
            diagnostics=[
                Diagnostic(
                    "error",
                    "CVXPY is not installed. Install backend dependencies before solving.",
                )
            ],
            code=generate_cvxpy_code(desk),
        )

    variables = {decision.id: create_cvxpy_variable(cp, decision) for decision in desk.find_cards_by_type("decision")}
    diagnostics: list[Diagnostic] = []
    for decision in desk.find_cards_by_type("decision"):
        diagnostics.extend(validate_decision_metadata(decision))

    objective_expr = 0
    objective = None
    if desk.objectives:
        _, atlas_objective = next(iter(desk.objectives.items()))
        for term in atlas_objective.terms:
            if not term.function_card_id:
                diagnostics.append(Diagnostic("warning", f'Objective term "{term.name}" has no function.'))
                continue
            function = desk.functions.get(term.function_card_id)
            if function is None:
                diagnostics.append(Diagnostic("warning", f'Function "{term.function_card_id}" was not found.'))
                continue
            objective_expr += compile_tagged_sum(function, desk, variables, diagnostics)
        objective = cp.Minimize(objective_expr) if atlas_objective.direction == "minimize" else cp.Maximize(objective_expr)
    else:
        objective = cp.Minimize(0)

    constraints = [
        compile_constraint(constraint, desk, variables, diagnostics)
        for constraint in desk.constraints.values()
    ]
    constraints.extend(decision_bound_constraints(decision, variables[decision.id]) for decision in desk.find_cards_by_type("decision"))
    constraints = [item for constraint_group in constraints for item in (constraint_group if isinstance(constraint_group, list) else [constraint_group])]
    constraints = [constraint for constraint in constraints if constraint is not None]
    return CvxpyCompileResult(
        cp.Problem(objective, constraints),
        variables=variables,
        diagnostics=diagnostics,
        code=generate_cvxpy_code(desk),
    )


def solve_problem(desk: "AtlasDesk") -> CvxpySolveResult:
    """Compile and solve a supported linear Atlas model."""

    compiled = compile_problem(desk)
    if compiled.problem is None:
        return CvxpySolveResult(
            "not_available",
            None,
            {},
            compiled.diagnostics,
            compiled.code,
            {},
        )

    try:
        compiled.problem.solve()
    except Exception as exc:  # pragma: no cover - solver-specific failures vary.
        return CvxpySolveResult(
            "error",
            None,
            {name: variable_value(variable) for name, variable in compiled.variables.items()},
            [*compiled.diagnostics, Diagnostic("error", str(exc))],
            compiled.code,
            {},
        )

    variable_values = {name: variable_value(variable) for name, variable in compiled.variables.items()}
    runtime_values = {
        name: value for name, value in variable_values.items() if value is not None
    }
    return CvxpySolveResult(
        str(compiled.problem.status),
        float(compiled.problem.value) if compiled.problem.value is not None else None,
        variable_values,
        compiled.diagnostics,
        compiled.code,
        {
            constraint_id: serialize_constraint_result(
                desk.evaluate_constraint(constraint_id, runtime_values=runtime_values)
            )
            for constraint_id in desk.constraints
        },
    )


def compile_constraint(
    constraint: Constraint,
    desk: "AtlasDesk",
    variables: dict[str, Any],
    diagnostics: list[Diagnostic],
):
    """Compile one linear constraint."""

    left = compile_expression(constraint.left, desk, variables, diagnostics, None)
    right = compile_expression(constraint.right, desk, variables, diagnostics, None)
    if constraint.relation == "<=":
        return left <= right
    if constraint.relation == ">=":
        return left >= right
    return left == right


def compile_tagged_sum(
    function: TaggedSumFunction,
    desk: "AtlasDesk",
    variables: dict[str, Any],
    diagnostics: list[Diagnostic],
):
    """Compile a TaggedSum to a CVXPY expression."""

    if not function.query_id or function.expression is None:
        diagnostics.append(Diagnostic("warning", f'TaggedSum "{function.name}" is incomplete.'))
        return 0
    return sum(
        compile_expression(function.expression, desk, variables, diagnostics, card)
        for card in desk.evaluate_query(function.query_id).matched_cards
    )


def compile_expression(
    expression: Expression,
    desk: "AtlasDesk",
    variables: dict[str, Any],
    diagnostics: list[Diagnostic],
    card: "AtlasCard | None",
):
    """Compile supported linear expression nodes."""

    if expression.kind == "literal":
        return numeric_or_zero(expression.value, diagnostics, "literal")
    if expression.kind == "property_ref":
        if card is None:
            diagnostics.append(Diagnostic("error", "Property reference requires card context."))
            return 0
        prop = card.property_by_name(expression.property_name or "")
        if prop is None:
            diagnostics.append(Diagnostic("warning", f'Card "{card.id}" missing property "{expression.property_name}".', card.id))
            return 0
        if prop.indexSetId:
            diagnostics.append(
                Diagnostic(
                    "warning",
                    f'Property "{card.id}.{prop.name}" is indexed by "{prop.indexSetId}"; scalar CVXPY compilation does not expand indexed sets yet.',
                    card.id,
                )
            )
        if prop.kind == "decision_ref":
            variable_id = str(prop.value or "")
            if variable_id not in variables:
                variable_id = f"{card.id}.{prop.name}"
                variables[variable_id] = lazy_cvxpy_variable(variable_id)
            return variables[variable_id]
        if prop.kind == "data_ref":
            return compile_data_reference(prop.value, desk, diagnostics, f"{card.id}.{prop.name}")
        return numeric_or_zero(prop.value, diagnostics, f"{card.id}.{prop.name}")
    if expression.kind == "function_ref" and expression.function_card_id:
        function = desk.functions.get(expression.function_card_id)
        return compile_tagged_sum(function, desk, variables, diagnostics) if function else 0
    if expression.kind == "add":
        return sum(compile_expression(term, desk, variables, diagnostics, card) for term in expression.terms)
    if expression.kind == "multiply":
        left = compile_expression(expression.left, desk, variables, diagnostics, card) if expression.left else 0
        right = compile_expression(expression.right, desk, variables, diagnostics, card) if expression.right else 0
        return left * right
    diagnostics.append(Diagnostic("error", f'Unsupported expression kind "{expression.kind}".'))
    return 0


def lazy_cvxpy_variable(name: str):
    """Create a CVXPY variable when cvxpy is available."""

    import cvxpy as cp

    return cp.Variable(nonneg=True, name=name)


def create_cvxpy_variable(cp, decision: "AtlasCard"):
    """Create a scalar CVXPY variable from Decision-card metadata."""

    metadata = decision.source.decision if decision.source is not None else None
    variable_type = metadata.variableType if metadata is not None else "continuous"
    return cp.Variable(
        boolean=variable_type == "binary",
        integer=variable_type == "integer",
        nonneg=variable_type == "continuous" and (metadata is None or metadata.lowerBound is None or metadata.lowerBound >= 0),
        name=decision.id,
    )


def decision_bound_constraints(decision: "AtlasCard", variable: Any):
    """Compile simple scalar bounds."""

    metadata = decision.source.decision if decision.source is not None else None
    if metadata is None:
        return []
    constraints = []
    if metadata.lowerBound is not None:
        constraints.append(variable >= metadata.lowerBound)
    if metadata.upperBound is not None:
        constraints.append(variable <= metadata.upperBound)
    return constraints


def validate_decision_metadata(decision: "AtlasCard") -> list[Diagnostic]:
    """Return metadata diagnostics without blocking compilation."""

    metadata = decision.source.decision if decision.source is not None else None
    if metadata is None:
        return []
    diagnostics: list[Diagnostic] = []
    if (
        metadata.lowerBound is not None
        and metadata.upperBound is not None
        and metadata.lowerBound > metadata.upperBound
    ):
        diagnostics.append(Diagnostic("error", f'Decision "{decision.id}" has lowerBound above upperBound.', decision.id))
    if metadata.variableType in {"integer", "binary"}:
        diagnostics.append(
            Diagnostic(
                "warning",
                f'Decision "{decision.id}" is {metadata.variableType}; solving requires a mixed-integer capable CVXPY solver.',
                decision.id,
            )
        )
    return diagnostics


def variable_code(decision: "AtlasCard") -> str:
    """Generate readable variable construction code."""

    metadata = decision.source.decision if decision.source is not None else None
    if metadata is None or metadata.variableType == "continuous":
        return f'cp.Variable(nonneg=True, name="{decision.id}")'
    if metadata.variableType == "binary":
        return f'cp.Variable(boolean=True, name="{decision.id}")'
    return f'cp.Variable(integer=True, name="{decision.id}")'


def numeric_or_zero(value: object, diagnostics: list[Diagnostic], label: str) -> float:
    """Coerce a numeric constant or record a diagnostic."""

    if isinstance(value, bool) or value is None:
        diagnostics.append(Diagnostic("warning", f"{label} is not numeric."))
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            pass
    diagnostics.append(Diagnostic("warning", f"{label} is not numeric."))
    return 0.0


def compile_data_reference(value: object, desk: "AtlasDesk", diagnostics: list[Diagnostic], label: str) -> float:
    """Compile a small data_ref using Data-card preview metadata."""

    if not isinstance(value, dict):
        diagnostics.append(Diagnostic("warning", f"{label} data_ref is not structured."))
        return 0.0
    data_card_id = value.get("dataCardId")
    column = value.get("column")
    if not isinstance(data_card_id, str) or not isinstance(column, str):
        diagnostics.append(Diagnostic("warning", f"{label} data_ref requires dataCardId and column."))
        return 0.0
    data_card = desk.cards.get(data_card_id)
    if data_card is None or data_card.source is None or data_card.source.data is None:
        diagnostics.append(Diagnostic("warning", f'Data card "{data_card_id}" was not found.', data_card_id))
        return 0.0
    if column not in data_card.source.data.columns:
        diagnostics.append(Diagnostic("warning", f'Column "{column}" was not found in "{data_card_id}".', data_card_id))
        return 0.0
    row_index = value.get("rowIndex", 0)
    row_index = row_index if isinstance(row_index, int) else 0
    try:
        return numeric_or_zero(data_card.source.data.previewRows[row_index].get(column), diagnostics, f"{data_card_id}.{column}")
    except IndexError:
        diagnostics.append(Diagnostic("warning", f"{label} rowIndex is outside preview data."))
        return 0.0


def variable_value(variable: Any) -> float | None:
    """Return a scalar variable value if available."""

    if variable.value is None:
        return None
    try:
        return float(variable.value)
    except TypeError:
        return None


def variable_name(value: str) -> str:
    """Return a Python-safe variable name."""

    return "var_" + "".join(char if char.isalnum() else "_" for char in value)


def serialize_constraint_result(result) -> dict[str, Any]:
    """Return a solve-time constraint evaluation payload."""

    return {
        "left": result.left,
        "right": result.right,
        "residual": result.residual,
        "active": result.active,
        "satisfied": result.satisfied,
        "diagnostics": [
            {
                "level": diagnostic.level,
                "message": diagnostic.message,
                "sourceId": diagnostic.source_id,
            }
            for diagnostic in result.diagnostics
        ],
    }
