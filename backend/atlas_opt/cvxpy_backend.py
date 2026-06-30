"""Minimal CVXPY backend adapter for the first linear Atlas slice."""

from __future__ import annotations

from dataclasses import dataclass, field
import keyword
import re
from typing import TYPE_CHECKING, Any

from .constraints import Constraint
from .cvxpy_inspector import CvxpyInspector, CompiledObject
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
    variable_values: dict[str, Any]
    diagnostics: list[Diagnostic]
    code: str
    constraint_values: dict[str, dict[str, Any]] = field(default_factory=dict)
    variables: list[dict[str, Any]] = field(default_factory=list)
    solver_name: str | None = None


def generate_cvxpy_code(desk: "AtlasDesk") -> str:
    """Generate readable CVXPY-oriented code for the supported linear subset."""

    if desk.source_ir is not None and desk.source_ir.modelObjects.all_objects():
        return generate_cvxpy_first_code(desk.source_ir)

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


def generate_cvxpy_first_code(ir) -> str:
    """Generate readable CVXPY code from CVXPY-first modelObjects IR."""

    names = cvxpy_first_name_map(ir)
    uses_numpy = any(isinstance(getattr(constant, "value", None), list) for constant in ir.modelObjects.constants)
    lines = ["import cvxpy as cp"]
    if uses_numpy:
        lines.append("import numpy as np")
    lines.append("")
    for variable in ir.modelObjects.variables:
        lines.append(f'{names[variable.id]} = cp.Variable({shape_argument(getattr(variable, "shape", None))}name="{variable.name}")')
    if ir.modelObjects.variables:
        lines.append("")
    for constant in ir.modelObjects.constants:
        value = getattr(constant, "value", None)
        if value is not None:
            lines.append(f"{names[constant.id]} = {constant_code(value)}")
    if ir.modelObjects.constants:
        lines.append("")

    expression_cache: dict[str, str] = {}
    for atom in ir.modelObjects.atoms:
        lines.append(f"{names[atom.id]} = {cvxpy_first_expression_code(ir, atom.id, names, expression_cache)}")
    if ir.modelObjects.atoms:
        lines.append("")

    objective_id = first_problem_objective_id(ir) or (ir.modelObjects.objectives[0].id if ir.modelObjects.objectives else None)
    if objective_id:
        lines.append(f"objective = {cvxpy_first_objective_code(ir, objective_id, names, expression_cache)}")
    else:
        lines.append("objective = cp.Minimize(0)")
    constraint_ids = first_problem_constraint_ids(ir) or [constraint.id for constraint in ir.modelObjects.constraints]
    lines.append("constraints = [")
    for constraint_id in constraint_ids:
        constraint_code = cvxpy_first_constraint_code(ir, constraint_id, names, expression_cache)
        if constraint_code:
            lines.append(f"    {constraint_code},")
    lines.append("]")
    lines.append("problem = cp.Problem(objective, constraints)")
    lines.append("problem.solve()")
    lines.append('print("status", problem.status)')
    lines.append('print("objective", problem.value)')
    for variable in ir.modelObjects.variables:
        lines.append(f'print("{variable.name}", {names[variable.id]}.value)')
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

    if desk.source_ir is not None and desk.source_ir.modelObjects.all_objects():
        return solve_cvxpy_first_problem(desk)

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


def solve_cvxpy_first_problem(desk: "AtlasDesk") -> CvxpySolveResult:
    """Compile and solve a CVXPY-first modelObjects problem using generic atoms."""

    try:
        import cvxpy as cp
    except ModuleNotFoundError:
        return CvxpySolveResult(
            "not_available",
            None,
            {},
            [Diagnostic("error", "CVXPY is not installed. Install backend dependencies before solving.")],
            generate_cvxpy_code(desk),
            {},
        )
    ir = desk.source_ir
    if ir is None:
        return CvxpySolveResult("error", None, {}, [Diagnostic("error", "Missing source IR.")], generate_cvxpy_code(desk), {})
    inspector = CvxpyInspector(ir, cp)
    compiled_problem = None
    if ir.modelObjects.problems:
        compiled_problem = inspector.compile_object(ir.modelObjects.problems[0].id)
    if compiled_problem is None and ir.modelObjects.objectives:
        objective = inspector.compile_object(ir.modelObjects.objectives[0].id)
        constraints = [
            compiled.value
            for constraint in ir.modelObjects.constraints
            for compiled in [inspector.compile_object(constraint.id)]
            if compiled is not None
        ]
        if objective is not None:
            compiled_problem = CompiledObject(cp.Problem(objective.value, constraints))
    if compiled_problem is None:
        return CvxpySolveResult(
            "error",
            None,
            cvxpy_first_variable_values(ir, inspector),
            [*inspector.result.diagnostics, Diagnostic("error", "No compilable CVXPY Problem was found.")],
            generate_cvxpy_code(desk),
            {},
            cvxpy_first_variable_details(ir, inspector),
        )
    try:
        compiled_problem.value.solve()
    except Exception as exc:  # pragma: no cover - solver availability varies.
        return CvxpySolveResult(
            "error",
            None,
            cvxpy_first_variable_values(ir, inspector),
            [*inspector.result.diagnostics, Diagnostic("error", str(exc))],
            generate_cvxpy_code(desk),
            {},
            cvxpy_first_variable_details(ir, inspector),
        )
    variable_values = cvxpy_first_variable_values(ir, inspector)
    return CvxpySolveResult(
        str(compiled_problem.value.status),
        float(compiled_problem.value.value) if compiled_problem.value.value is not None else None,
        variable_values,
        inspector.result.diagnostics,
        generate_cvxpy_code(desk),
        cvxpy_first_constraint_values(ir, inspector),
        cvxpy_first_variable_details(ir, inspector),
        getattr(compiled_problem.value, "solver_stats", None).solver_name
        if getattr(compiled_problem.value, "solver_stats", None) is not None
        else None,
    )


def cvxpy_first_variable_values(ir, inspector: CvxpyInspector) -> dict[str, Any]:
    """Serialize CVXPY-first variable values by model object id."""

    values: dict[str, Any] = {}
    for variable in ir.modelObjects.variables:
        compiled = inspector.compiled.get(variable.id)
        value = getattr(compiled.value, "value", None) if compiled is not None else None
        if value is None:
            values[variable.id] = None
        elif hasattr(value, "tolist"):
            values[variable.id] = value.tolist()
        else:
            values[variable.id] = variable_value(compiled.value)
    return values


def cvxpy_first_variable_details(ir, inspector: CvxpyInspector) -> list[dict[str, Any]]:
    """Serialize CVXPY-first variable details by model object id/name."""

    values = cvxpy_first_variable_values(ir, inspector)
    return [
        {
            "id": variable.id,
            "name": variable.name,
            "value": values.get(variable.id),
        }
        for variable in ir.modelObjects.variables
    ]


def cvxpy_first_constraint_values(ir, inspector: CvxpyInspector) -> dict[str, dict[str, Any]]:
    """Serialize basic left/right/residual values for CVXPY-first constraints."""

    results: dict[str, dict[str, Any]] = {}
    for constraint in ir.modelObjects.constraints:
        inputs = dict(inspector.connected_inputs(constraint.id))
        lhs_id = inputs.get("lhs")
        rhs_id = inputs.get("rhs")
        lhs = inspector.compile_object(lhs_id) if lhs_id else None
        rhs = inspector.compile_object(rhs_id) if rhs_id else None
        left = jsonable_runtime_value(getattr(lhs.value, "value", lhs.value)) if lhs is not None else None
        right = jsonable_runtime_value(getattr(rhs.value, "value", rhs.value)) if rhs is not None else None
        residual = numeric_residual(left, right)
        satisfied = constraint_satisfied(left, right, constraint.constraint.operator if constraint.constraint is not None else "<=")
        results[constraint.id] = {
            "id": constraint.id,
            "name": constraint.name,
            "left": left,
            "right": right,
            "residual": residual,
            "satisfied": satisfied,
        }
    return results


def cvxpy_first_name_map(ir) -> dict[str, str]:
    """Return deterministic safe Python names for all model objects."""

    names: dict[str, str] = {}
    used: set[str] = set()
    for model_object in ir.modelObjects.all_objects():
        base = safe_python_name(model_object.name or model_object.id)
        candidate = base
        index = 2
        while candidate in used:
            candidate = f"{base}_{index}"
            index += 1
        names[model_object.id] = candidate
        used.add(candidate)
    return names


def cvxpy_first_expression_code(ir, object_id: str, names: dict[str, str], cache: dict[str, str]) -> str:
    """Return Python expression code for one expression-like model object."""

    if object_id in cache:
        return names.get(object_id, cache[object_id])
    objects = {model_object.id: model_object for model_object in ir.modelObjects.all_objects()}
    model_object = objects.get(object_id)
    if model_object is None:
        return f'__missing_object__("{object_id}")'
    if model_object.kind in {"variable", "parameter", "constant"}:
        return names[object_id]
    if model_object.kind == "atom":
        connected = connected_inputs(ir, object_id)
        sources = [source for _, source in sorted(connected, key=lambda item: slot_sort_key_for_code(item[0]))]
        if not sources:
            sources = [
                input_value.get("objectId", repr(input_value.get("value")))
                if isinstance(input_value, dict)
                else str(input_value)
                for input_value in model_object.positionalInputs
            ]
        arg_codes = [cvxpy_first_expression_code(ir, source, names, cache) for source in sources]
        import_path = model_object.importPath or model_object.atomId or f"cvxpy.{model_object.atomName or model_object.name}"
        code = atom_call_code(import_path, arg_codes)
        cache[object_id] = code
        return code
    return names.get(object_id, model_object.name)


def cvxpy_first_objective_code(ir, objective_id: str, names: dict[str, str], cache: dict[str, str]) -> str:
    """Return Python code for a CVXPY objective."""

    objective = next((item for item in ir.modelObjects.objectives if item.id == objective_id), None)
    if objective is None:
        return "cp.Minimize(0)"
    sources = [source for _, source in sorted(connected_inputs(ir, objective_id), key=lambda item: slot_sort_key_for_code(item[0]))]
    expression = " + ".join(cvxpy_first_expression_code(ir, source, names, cache) for source in sources) if sources else "0"
    direction = objective.objective.direction if objective.objective is not None else "minimize"
    return f"cp.{'Maximize' if direction == 'maximize' else 'Minimize'}({expression})"


def cvxpy_first_constraint_code(ir, constraint_id: str, names: dict[str, str], cache: dict[str, str]) -> str | None:
    """Return Python code for a CVXPY constraint."""

    constraint = next((item for item in ir.modelObjects.constraints if item.id == constraint_id), None)
    if constraint is None:
        return None
    inputs = dict(connected_inputs(ir, constraint_id))
    lhs_id = inputs.get("lhs")
    rhs_id = inputs.get("rhs")
    if not lhs_id or not rhs_id:
        return f"# incomplete constraint {constraint.name}"
    relation = constraint.constraint.operator if constraint.constraint is not None else "<="
    op = "==" if relation == "=" else relation
    lhs = cvxpy_first_expression_code(ir, lhs_id, names, cache)
    rhs = cvxpy_first_expression_code(ir, rhs_id, names, cache)
    return f"{lhs} {op} {rhs}"


def first_problem_objective_id(ir) -> str | None:
    """Return objective id connected to the first problem."""

    if not ir.modelObjects.problems:
        return None
    problem_id = ir.modelObjects.problems[0].id
    return next((source for slot, source in connected_inputs(ir, problem_id) if slot == "objective"), None)


def first_problem_constraint_ids(ir) -> list[str]:
    """Return constraint ids connected to the first problem."""

    if not ir.modelObjects.problems:
        return []
    problem_id = ir.modelObjects.problems[0].id
    return [source for slot, source in connected_inputs(ir, problem_id) if slot == "constraints"]


def connected_inputs(ir, target_object_id: str) -> list[tuple[str, str]]:
    """Return slot/source object pairs for one object from IR connections."""

    inputs: list[tuple[str, str]] = []
    node_to_object = {node.id: node.modelObjectId for node in getattr(ir, "workspaceNodes", [])}
    for connection in ir.connections:
        target_id = connection.target.objectId or (node_to_object.get(connection.target.nodeId) if connection.target.nodeId else None)
        if target_id != target_object_id:
            continue
        source_id = connection.source.objectId or (node_to_object.get(connection.source.nodeId) if connection.source.nodeId else None)
        if source_id:
            inputs.append((connection.target.slot or "arg0", source_id))
    return inputs


def atom_call_code(import_path: str, arg_codes: list[str]) -> str:
    """Return Python code for a structural Atlas operator or CVXPY atom."""

    if import_path == "atlas.expression.add":
        return f"({' + '.join(arg_codes)})" if arg_codes else "0"
    if import_path == "atlas.expression.subtract":
        return f"({arg_codes[0]} - {arg_codes[1]})" if len(arg_codes) >= 2 else "# incomplete subtract"
    if import_path == "atlas.expression.multiply":
        return f"({arg_codes[0]} * {arg_codes[1]})" if len(arg_codes) >= 2 else "# incomplete multiply"
    if import_path == "atlas.expression.matmul":
        return f"({arg_codes[0]} @ {arg_codes[1]})" if len(arg_codes) >= 2 else "# incomplete matmul"
    atom_name = import_path.removeprefix("cvxpy.").split(".")[-1]
    return f"cp.{atom_name}({', '.join(arg_codes)})"


def constant_code(value: Any) -> str:
    """Return Python code for a scalar/vector/matrix constant."""

    if isinstance(value, list):
        return f"np.array({value!r})"
    return repr(value)


def shape_argument(shape: Any) -> str:
    """Return optional cp.Variable shape argument code."""

    normalized = cvxpy_shape_for_code(shape)
    return f"{normalized!r}, " if normalized != () else ""


def cvxpy_shape_for_code(value: Any) -> tuple[int, ...]:
    """Normalize loose IR shape metadata into a Python tuple."""

    if isinstance(value, int) and value > 0:
        return (value,)
    if isinstance(value, list) and all(isinstance(item, int) and item > 0 for item in value):
        return tuple(value)
    if isinstance(value, dict):
        raw = value.get("dimensions") or value.get("shape")
        if isinstance(raw, list) and all(isinstance(item, int) and item > 0 for item in raw):
            return tuple(raw)
    return ()


def safe_python_name(value: str) -> str:
    """Return a readable unique-ish Python identifier from IR names/ids."""

    candidate = re.sub(r"\W+", "_", value.strip()).strip("_") or "obj"
    if candidate[0].isdigit():
        candidate = f"obj_{candidate}"
    if keyword.iskeyword(candidate):
        candidate = f"{candidate}_"
    return candidate


def slot_sort_key_for_code(slot: str) -> tuple[int, str]:
    """Sort arg0/arg1 slots before named slots."""

    if slot.startswith("arg") and slot[3:].isdigit():
        return (int(slot[3:]), slot)
    if slot.startswith("term") and slot[4:].isdigit():
        return (int(slot[4:]), slot)
    return (999, slot)


def jsonable_runtime_value(value: Any) -> Any:
    """Return JSON-safe runtime value."""

    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (int, float, str, bool)) or value is None:
        return value
    return str(value)


def numeric_residual(left: Any, right: Any) -> float | None:
    """Return scalar left-right residual where feasible."""

    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return float(left - right)
    return None


def constraint_satisfied(left: Any, right: Any, operator: str) -> bool | None:
    """Return scalar satisfaction status where feasible."""

    if not isinstance(left, (int, float)) or not isinstance(right, (int, float)):
        return None
    tolerance = 1e-6
    if operator == "<=":
        return left <= right + tolerance
    if operator == ">=":
        return left + tolerance >= right
    return abs(left - right) <= tolerance


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
