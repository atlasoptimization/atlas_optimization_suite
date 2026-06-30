"""CVXPY-backed metadata inspection for CVXPY-first Atlas IR graphs."""

from __future__ import annotations

import importlib
from dataclasses import dataclass, field
from typing import Any

from .cvxpy_registry import discover_cvxpy_atoms
from .diagnostics import Diagnostic
from .schema import (
    AtlasIR,
    AtomObjectIR,
    ConnectionIR,
    ConstraintObjectIR,
    ModelObjectBaseIR,
    ObjectiveObjectIR,
    ProblemObjectIR,
)

_MISSING_INPUT = object()
ATLAS_OPERATOR_PATHS = {
    "atlas.expression.add",
    "atlas.expression.subtract",
    "atlas.expression.multiply",
    "atlas.expression.matmul",
}


@dataclass
class CvxpyInspectionResult:
    """Serializable result of inspecting an Atlas IR graph with CVXPY."""

    metadata: dict[str, dict[str, Any]] = field(default_factory=dict)
    diagnostics: list[Diagnostic] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        """Return API-friendly metadata and diagnostics."""

        return {
            "metadata": self.metadata,
            "diagnostics": [
                {
                    "level": diagnostic.level,
                    "message": diagnostic.message,
                    "sourceId": diagnostic.source_id,
                }
                for diagnostic in self.diagnostics
            ],
        }


@dataclass
class CompiledObject:
    """Compiled CVXPY object plus optional raw scalar for atom parameters."""

    value: Any
    raw_value: Any = None


class CvxpyInspector:
    """Compile CVXPY-first IR objects enough to ask CVXPY for metadata."""

    def __init__(self, ir: AtlasIR, cp: Any):
        self.ir = ir
        self.cp = cp
        self.result = CvxpyInspectionResult()
        self.compiled: dict[str, CompiledObject] = {}
        self.objects = {model_object.id: model_object for model_object in ir.modelObjects.all_objects()}
        self.nodes = {node.id: node for node in ir.workspaceNodes}
        self.allowed_atoms = discover_cvxpy_atoms()
        self.allowed_import_paths = {atom.importPath for atom in self.allowed_atoms}
        self.allowed_names = {atom.name for atom in self.allowed_atoms}

    def inspect(self) -> CvxpyInspectionResult:
        """Inspect all compilable objects and workspace references."""

        for model_object in self.ir.modelObjects.all_objects():
            self.compile_object(model_object.id)
        for node in self.ir.workspaceNodes:
            if node.modelObjectId in self.result.metadata:
                self.result.metadata[node.id] = dict(self.result.metadata[node.modelObjectId])
        return self.result

    def compile_object(self, object_id: str) -> CompiledObject | None:
        """Compile one object by id, collecting diagnostics instead of crashing."""

        if object_id in self.compiled:
            return self.compiled[object_id]
        model_object = self.objects.get(object_id)
        if model_object is None:
            self.add_diagnostic("error", f'Model object "{object_id}" was not found.', object_id)
            return None
        try:
            compiled = self.compile_model_object(model_object)
        except Exception as exc:  # CVXPY raises varied validation exceptions.
            self.add_diagnostic("error", f'CVXPY could not compile "{model_object.name}": {exc}', object_id)
            return None
        if compiled is not None:
            self.compiled[object_id] = compiled
            metadata = metadata_from_cvxpy(compiled.value)
            self.result.metadata[object_id] = metadata
            if metadata.get("is_dcp") is False:
                self.add_diagnostic("error", f'Object "{model_object.name}" is not DCP according to CVXPY.', object_id)
        return compiled

    def compile_model_object(self, model_object: ModelObjectBaseIR) -> CompiledObject | None:
        """Dispatch compilation by Atlas model-object kind."""

        if model_object.kind == "variable":
            shape = cvxpy_shape(getattr(model_object, "shape", None))
            variable = self.cp.Variable(shape=shape, name=model_object.name)
            decision = getattr(model_object, "decision", None)
            if decision is not None and decision.initialValue is not None:
                variable.value = decision.initialValue
            return CompiledObject(variable)
        if model_object.kind == "parameter":
            shape = cvxpy_shape(getattr(model_object, "shape", None))
            return CompiledObject(self.cp.Parameter(shape=shape, name=model_object.name))
        if model_object.kind == "constant":
            value = getattr(model_object, "value", None)
            if value is None:
                value = parse_numeric(model_object.name)
            if value is None:
                self.add_diagnostic("warning", f'Constant "{model_object.name}" has no numeric value.', model_object.id)
                return None
            raw_value = value if isinstance(value, (int, float, str, bool)) or value is None else None
            return CompiledObject(self.cp.Constant(cvxpy_constant_value(value)), raw_value)
        if model_object.kind in {"atom", "expression"}:
            return self.compile_atom(model_object)  # type: ignore[arg-type]
        if model_object.kind == "constraint":
            return self.compile_constraint(model_object)  # type: ignore[arg-type]
        if model_object.kind == "objective":
            return self.compile_objective(model_object)  # type: ignore[arg-type]
        if model_object.kind == "problem":
            return self.compile_problem(model_object)  # type: ignore[arg-type]
        return None

    def compile_atom(self, atom: AtomObjectIR) -> CompiledObject | None:
        """Compile a generic CVXPY atom call from connected argument slots."""

        inputs = self.atom_positional_inputs(atom)
        keyword_inputs = self.atom_keyword_inputs(atom)
        if not inputs and not keyword_inputs:
            self.add_diagnostic("warning", f'Atom "{atom.name}" is incomplete: connect at least one input.', atom.id)
            return None
        import_path = atom_import_path(atom)
        callable_value = resolve_registered_cvxpy_callable(
            self.cp,
            import_path,
            self.allowed_import_paths,
            self.allowed_names,
        )
        if callable_value is None:
            self.add_diagnostic(
                "error",
                f'Atom "{atom.name}" importPath "{import_path}" is not registered for this backend.',
                atom.id,
            )
            return None
        args: list[Any] = []
        for _, source in sorted(inputs, key=lambda item: slot_sort_key(item[0])):
            resolved = self.resolve_atom_input(source, atom.id)
            if resolved is _MISSING_INPUT:
                return None
            args.append(resolved)
        kwargs: dict[str, Any] = {}
        for name, source in keyword_inputs.items():
            resolved = self.resolve_atom_input(source, atom.id)
            if resolved is _MISSING_INPUT:
                return None
            kwargs[name] = resolved
        try:
            return CompiledObject(callable_value(*args, **kwargs))
        except Exception as exc:
            self.add_diagnostic("error", f'Invalid CVXPY atom call "{atom.name}": {exc}', atom.id)
            return None

    def atom_positional_inputs(self, atom: AtomObjectIR) -> list[tuple[str, Any]]:
        """Return positional sources from canonical atom inputs plus visual connections."""

        inputs = [
            (f"arg{index}", input_value)
            for index, input_value in enumerate(atom.positionalInputs)
        ]
        connected = self.connected_inputs(atom.id)
        return connected or inputs

    def atom_keyword_inputs(self, atom: AtomObjectIR) -> dict[str, Any]:
        """Return keyword input sources from canonical atom inputs."""

        return dict(atom.keywordInputs)

    def resolve_atom_input(self, input_value: Any, source_id: str) -> Any:
        """Resolve a literal/reference input into a CVXPY argument."""

        if isinstance(input_value, str):
            compiled = self.compile_object(input_value)
            if compiled is None:
                self.add_diagnostic("warning", f'Atom input "{input_value}" is unavailable.', source_id)
                return _MISSING_INPUT
            return compiled.raw_value if compiled.raw_value is not None else compiled.value
        if isinstance(input_value, dict):
            if input_value.get("kind") == "literal":
                return input_value.get("value")
            object_id = input_value.get("objectId")
            if isinstance(object_id, str):
                compiled = self.compile_object(object_id)
                if compiled is None:
                    self.add_diagnostic("warning", f'Atom input "{object_id}" is unavailable.', source_id)
                    return _MISSING_INPUT
                return compiled.raw_value if compiled.raw_value is not None else compiled.value
        self.add_diagnostic("warning", "Atom input is incomplete.", source_id)
        return _MISSING_INPUT

    def compile_constraint(self, constraint: ConstraintObjectIR) -> CompiledObject | None:
        """Compile a CVXPY constraint from LHS/RHS slots when connected."""

        inputs = dict(self.connected_inputs(constraint.id))
        lhs_id = inputs.get("lhs")
        rhs_id = inputs.get("rhs")
        if not lhs_id or not rhs_id:
            self.add_diagnostic("warning", f'Constraint "{constraint.name}" is incomplete: connect LHS and RHS.', constraint.id)
            return None
        lhs = self.compile_object(lhs_id)
        rhs = self.compile_object(rhs_id)
        if lhs is None or rhs is None:
            return None
        relation = constraint.constraint.operator if constraint.constraint is not None else "<="
        if relation == "<=":
            return CompiledObject(lhs.value <= rhs.value)
        if relation == ">=":
            return CompiledObject(lhs.value >= rhs.value)
        return CompiledObject(lhs.value == rhs.value)

    def compile_objective(self, objective: ObjectiveObjectIR) -> CompiledObject | None:
        """Compile a CVXPY objective from connected term slots."""

        inputs = self.connected_inputs(objective.id)
        if not inputs:
            self.add_diagnostic("warning", f'Objective "{objective.name}" is incomplete: connect at least one term.', objective.id)
            return None
        terms = [self.compile_object(source_id) for _, source_id in sorted(inputs, key=lambda item: slot_sort_key(item[0]))]
        if any(term is None for term in terms):
            return None
        expression = sum(term.value for term in terms if term is not None)
        direction = objective.objective.direction if objective.objective is not None else "minimize"
        return CompiledObject(self.cp.Maximize(expression) if direction == "maximize" else self.cp.Minimize(expression))

    def compile_problem(self, problem: ProblemObjectIR) -> CompiledObject | None:
        """Compile a CVXPY Problem from objective and constraint slots."""

        inputs = self.connected_inputs(problem.id)
        objective_id = next((source_id for slot, source_id in inputs if slot == "objective"), None)
        if not objective_id:
            self.add_diagnostic("warning", f'Problem "{problem.name}" is incomplete: connect an objective.', problem.id)
            return None
        objective = self.compile_object(objective_id)
        constraints = [
            compiled.value
            for slot, source_id in inputs
            if slot == "constraints"
            for compiled in [self.compile_object(source_id)]
            if compiled is not None
        ]
        if objective is None:
            return None
        return CompiledObject(self.cp.Problem(objective.value, constraints))

    def connected_inputs(self, target_object_id: str) -> list[tuple[str, str]]:
        """Return target slot to source object id pairs for one canonical object."""

        inputs: list[tuple[str, str]] = []
        for connection in self.ir.connections:
            target_id = endpoint_object_id(self.ir, connection, "target")
            if target_id != target_object_id:
                continue
            source_id = endpoint_object_id(self.ir, connection, "source")
            if source_id is None:
                self.add_diagnostic("warning", f'Connection "{connection.id}" has no source object.', target_object_id)
                continue
            inputs.append((connection.target.slot or "arg0", source_id))
        return inputs

    def add_diagnostic(self, level: str, message: str, source_id: str | None = None) -> None:
        """Collect a structured diagnostic."""

        self.result.diagnostics.append(Diagnostic(level, message, source_id))


def inspect_cvxpy_metadata(ir: AtlasIR) -> CvxpyInspectionResult:
    """Inspect an Atlas IR graph with installed CVXPY, or report unavailability."""

    if not ir.modelObjects.all_objects() and not ir.workspaceNodes and not ir.connections:
        return CvxpyInspectionResult()
    try:
        import cvxpy as cp  # type: ignore
    except ModuleNotFoundError:
        return CvxpyInspectionResult(
            diagnostics=[
                Diagnostic(
                    "warning",
                    "CVXPY is not installed; backend metadata inspection is unavailable.",
                )
            ]
        )
    return CvxpyInspector(ir, cp).inspect()


def metadata_from_cvxpy(value: Any) -> dict[str, Any]:
    """Extract shape/sign/curvature/DCP metadata from a CVXPY object."""

    metadata: dict[str, Any] = {}
    if hasattr(value, "shape"):
        metadata["shape"] = list(value.shape) if isinstance(value.shape, tuple) else value.shape
    if hasattr(value, "sign"):
        metadata["sign"] = str(value.sign)
    if hasattr(value, "curvature"):
        metadata["curvature"] = str(value.curvature)
    if hasattr(value, "is_dcp"):
        metadata["is_dcp"] = safe_bool(value.is_dcp)
    if hasattr(value, "is_dgp"):
        metadata["is_dgp"] = safe_bool(value.is_dgp)
    if hasattr(value, "value"):
        metadata["value"] = jsonable_value(value.value)
    if hasattr(value, "domain"):
        metadata["domain"] = jsonable_domain(getattr(value, "domain"))
    if value.__class__.__name__.endswith("Problem"):
        metadata["is_dcp"] = safe_bool(value.is_dcp)
        metadata["is_dgp"] = safe_bool(value.is_dgp)
    return metadata


def endpoint_object_id(ir: AtlasIR, connection: ConnectionIR, side: str) -> str | None:
    """Resolve a connection endpoint to a canonical object id."""

    endpoint = connection.source if side == "source" else connection.target
    if endpoint.objectId:
        return endpoint.objectId
    if endpoint.nodeId:
        node = next((workspace_node for workspace_node in ir.workspaceNodes if workspace_node.id == endpoint.nodeId), None)
        return node.modelObjectId if node else None
    return None


def atom_import_path(atom: AtomObjectIR) -> str:
    """Return a CVXPY import path from atom metadata."""

    atom_spec = getattr(atom, "atomSpec", None)
    if isinstance(atom_spec, dict) and isinstance(atom_spec.get("importPath"), str):
        return atom_spec["importPath"]
    extra = getattr(atom, "model_extra", None) or {}
    if isinstance(extra.get("atomSpec"), dict) and isinstance(extra["atomSpec"].get("importPath"), str):
        return extra["atomSpec"]["importPath"]
    if atom.importPath:
        return atom.importPath
    return atom.atomId or f"cvxpy.{atom.name}"


def resolve_registered_cvxpy_callable(
    cp: Any,
    import_path: str,
    allowed_import_paths: set[str],
    allowed_names: set[str],
) -> Any | None:
    """Resolve a CVXPY callable only when the path/name is registry-approved."""

    if import_path in ATLAS_OPERATOR_PATHS:
        return atlas_operator(import_path)
    name = import_path.split(".")[-1]
    if import_path not in allowed_import_paths and not (
        import_path == f"cvxpy.{name}" and name in allowed_names
    ):
        return None
    if import_path == f"cvxpy.{name}":
        value = getattr(cp, name, None)
        return value if callable(value) else None
    module_name, _, attr_name = import_path.rpartition(".")
    if not module_name or not attr_name:
        return None
    try:
        module = importlib.import_module(module_name)
    except Exception:
        return None
    value = getattr(module, attr_name, None)
    return value if callable(value) else None


def atlas_operator(import_path: str):
    """Return internal structural expression operators used where CVXPY has Python syntax."""

    if import_path == "atlas.expression.add":
        return lambda left, right: left + right
    if import_path == "atlas.expression.subtract":
        return lambda left, right: left - right
    if import_path == "atlas.expression.multiply":
        return lambda left, right: left * right
    if import_path == "atlas.expression.matmul":
        return lambda left, right: left @ right
    return None


def slot_sort_key(slot: str) -> tuple[int, str]:
    """Sort arg0/arg1 slots before named slots."""

    if slot.startswith("arg") and slot[3:].isdigit():
        return (int(slot[3:]), slot)
    if slot.startswith("term") and slot[4:].isdigit():
        return (int(slot[4:]), slot)
    return (100, slot)


def parse_numeric(value: object) -> float | int | None:
    """Parse numeric constants from object values or names."""

    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        try:
            parsed = float(value)
        except ValueError:
            return None
        return int(parsed) if parsed.is_integer() else parsed
    return None


def cvxpy_shape(value: Any) -> Any:
    """Return a CVXPY shape from loose IR metadata."""

    if isinstance(value, int) and value > 0:
        return (value,)
    if isinstance(value, list) and all(isinstance(item, int) and item > 0 for item in value):
        return tuple(value)
    if isinstance(value, dict):
        raw = value.get("dimensions") or value.get("shape")
        if isinstance(raw, list) and all(isinstance(item, int) and item > 0 for item in raw):
            return tuple(raw)
    return ()


def cvxpy_constant_value(value: Any) -> Any:
    """Return a CVXPY-safe constant value."""

    if isinstance(value, list):
        try:
            import numpy as np

            return np.array(value)
        except ModuleNotFoundError:
            return value
    return value


def safe_bool(method: Any) -> bool | None:
    """Call a CVXPY boolean method without leaking exceptions."""

    try:
        return bool(method())
    except Exception:
        return None


def jsonable_value(value: Any) -> Any:
    """Convert CVXPY values to JSON-friendly scalars/lists when available."""

    if value is None:
        return None
    if hasattr(value, "tolist"):
        return value.tolist()
    if isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def jsonable_domain(domain: Any) -> list[str]:
    """Return compact CVXPY domain constraints when available."""

    try:
        return [str(item) for item in domain]
    except Exception:
        return []
