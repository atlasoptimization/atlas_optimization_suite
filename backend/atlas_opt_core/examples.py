"""Built-in Atlas IR examples for backend and deployment tests."""

from __future__ import annotations

from typing import Any


def tiny_lp_ir() -> dict[str, Any]:
    """Return ordinary Atlas IR for the Tiny LP showcase."""

    variables = [
        {"id": "var-x", "kind": "variable", "name": "x"},
        {"id": "var-y", "kind": "variable", "name": "y"},
    ]
    constants = [
        {"id": "const-3", "kind": "constant", "name": "3", "value": 3},
        {"id": "const-2", "kind": "constant", "name": "2", "value": 2},
        {"id": "const-4", "kind": "constant", "name": "4", "value": 4},
        {"id": "const-3-bound", "kind": "constant", "name": "3", "value": 3},
        {"id": "const-0", "kind": "constant", "name": "0", "value": 0},
    ]
    atoms = [
        atom("atom-3x", "multiply", "atlas.expression.multiply", ["var-x", "const-3"]),
        atom("atom-2y", "multiply", "atlas.expression.multiply", ["var-y", "const-2"]),
        atom("atom-objective", "add", "atlas.expression.add", ["atom-3x", "atom-2y"]),
        atom("atom-x-plus-y", "add", "atlas.expression.add", ["var-x", "var-y"]),
    ]
    constraints = [
        constraint("constraint-sum", "x + y <= 4", "<="),
        constraint("constraint-x-upper", "x <= 2", "<="),
        constraint("constraint-y-upper", "y <= 3", "<="),
        constraint("constraint-x-lower", "x >= 0", ">="),
        constraint("constraint-y-lower", "y >= 0", ">="),
    ]
    return {
        "schemaVersion": "0.2-cvxpy",
        "metadata": {"schemaVersion": "0.2-cvxpy", "source": "atlas-gui", "title": "Tiny LP", "exportedAt": "2026-01-01T00:00:00Z"},
        "modelObjects": {
            "variables": variables,
            "parameters": [],
            "constants": constants,
            "atoms": atoms,
            "expressions": [],
            "constraints": constraints,
            "objectives": [{"id": "objective", "kind": "objective", "name": "Maximize 3x + 2y", "objective": {"direction": "maximize", "terms": []}}],
            "problems": [{"id": "problem", "kind": "problem", "name": "Tiny LP problem", "objectiveIds": ["objective"], "constraintIds": [item["id"] for item in constraints]}],
            "solvers": [],
            "results": [],
            "workspaceReferences": [],
        },
        "workspaceNodes": [],
        "connections": [
            conn("objective-term", "atom-objective", "objective", "term0"),
            conn("problem-objective", "objective", "problem", "objective"),
            conn("c-sum-l", "atom-x-plus-y", "constraint-sum", "lhs"),
            conn("c-sum-r", "const-4", "constraint-sum", "rhs"),
            conn("c-xu-l", "var-x", "constraint-x-upper", "lhs"),
            conn("c-xu-r", "const-2", "constraint-x-upper", "rhs"),
            conn("c-yu-l", "var-y", "constraint-y-upper", "lhs"),
            conn("c-yu-r", "const-3-bound", "constraint-y-upper", "rhs"),
            conn("c-xl-l", "var-x", "constraint-x-lower", "lhs"),
            conn("c-xl-r", "const-0", "constraint-x-lower", "rhs"),
            conn("c-yl-l", "var-y", "constraint-y-lower", "lhs"),
            conn("c-yl-r", "const-0", "constraint-y-lower", "rhs"),
            *[conn(f"problem-{item['id']}", item["id"], "problem", "constraints") for item in constraints],
        ],
    }


def atom(object_id: str, name: str, import_path: str, sources: list[str]) -> dict[str, Any]:
    """Return an AtomObject IR dict."""

    return {
        "id": object_id,
        "kind": "atom",
        "name": name,
        "atomName": name,
        "importPath": import_path,
        "displayName": name,
        "positionalInputs": [{"id": f"input-{source}", "name": source, "kind": "reference", "objectId": source} for source in sources],
        "keywordInputs": {},
    }


def constraint(object_id: str, name: str, operator: str) -> dict[str, Any]:
    """Return a ConstraintObject IR dict."""

    return {
        "id": object_id,
        "kind": "constraint",
        "name": name,
        "constraint": {
            "name": name,
            "operator": operator,
            "left": {"kind": "constant", "value": 0},
            "right": {"kind": "constant", "value": 0},
        },
    }


def conn(connection_id: str, source: str, target: str, slot: str) -> dict[str, Any]:
    """Return an object-level semantic connection."""

    return {
        "id": connection_id,
        "source": {"objectId": source, "port": "expression"},
        "target": {"objectId": target, "slot": slot},
        "semanticReference": {"kind": "expression_input", "objectId": source},
    }
