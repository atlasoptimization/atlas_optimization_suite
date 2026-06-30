"""Backend solve regressions for built-in CVXPY-first examples."""

import pytest

from atlas_opt.optimizer import AtlasOptimizer


def test_tiny_lp_solves_expected_result_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    response = AtlasOptimizer.from_ir(tiny_lp_ir()).solve()

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["variableValues"]["var-x"] == pytest.approx(2, abs=1e-4)
    assert response["variableValues"]["var-y"] == pytest.approx(2, abs=1e-4)
    assert response["variables"] == [
        {"id": "var-x", "name": "x", "value": pytest.approx(2, abs=1e-4)},
        {"id": "var-y", "name": "y", "value": pytest.approx(2, abs=1e-4)},
    ]
    assert response["objectiveValue"] == pytest.approx(10, abs=1e-4)
    assert response["constraints"]["constraint-sum"]["satisfied"] is True
    assert "problem.solve()" in response["generatedCode"]


def test_tiny_lp_generate_code_from_ir_without_cvxpy() -> None:
    response = AtlasOptimizer.from_ir(tiny_lp_ir()).generate_code()

    assert "import cvxpy as cp" in response["code"]
    assert 'x = cp.Variable(name="x")' in response["code"]
    assert 'y = cp.Variable(name="y")' in response["code"]
    assert "objective = cp.Maximize" in response["code"]
    assert "x + y" in response["code"]
    assert "problem = cp.Problem(objective, constraints)" in response["code"]
    assert "problem.solve()" in response["code"]


def test_invalid_cvxpy_first_model_returns_diagnostics_without_crashing() -> None:
    ir = tiny_lp_ir()
    ir["connections"] = [
        connection
        for connection in ir["connections"]
        if connection["target"].get("objectId") != "objective"
    ]

    response = AtlasOptimizer.from_ir(ir).solve()

    assert response["status"] in {"error", "not_available"}
    assert response["diagnostics"]


def test_least_squares_solves_expected_result_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    response = AtlasOptimizer.from_ir(least_squares_ir(False)).solve()

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["variableValues"]["var-x"] == pytest.approx([1.1667, 0.5], abs=1e-3)


def test_ridge_solves_expected_result_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    response = AtlasOptimizer.from_ir(least_squares_ir(True)).solve()

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["variableValues"]["var-x"] == pytest.approx([0.8, 0.6], abs=1e-3)


def base_ir(title: str) -> dict:
    return {
        "schemaVersion": "0.2-cvxpy",
        "metadata": {"schemaVersion": "0.2-cvxpy", "title": title, "source": "atlas-gui"},
        "modelObjects": {
            "variables": [],
            "parameters": [],
            "constants": [],
            "atoms": [],
            "constraints": [],
            "objectives": [],
            "problems": [],
        },
        "connections": [],
    }


def tiny_lp_ir() -> dict:
    ir = base_ir("Tiny LP")
    ir["modelObjects"]["variables"] = [
        {"id": "var-x", "kind": "variable", "name": "x"},
        {"id": "var-y", "kind": "variable", "name": "y"},
    ]
    ir["modelObjects"]["constants"] = [
        {"id": "const-3", "kind": "constant", "name": "3", "value": 3},
        {"id": "const-2", "kind": "constant", "name": "2", "value": 2},
        {"id": "const-4", "kind": "constant", "name": "4", "value": 4},
        {"id": "const-3-bound", "kind": "constant", "name": "3", "value": 3},
        {"id": "const-0", "kind": "constant", "name": "0", "value": 0},
    ]
    ir["modelObjects"]["atoms"] = [
        atom("atom-3x", "atlas.expression.multiply", [ref("var-x"), ref("const-3")]),
        atom("atom-2y", "atlas.expression.multiply", [ref("var-y"), ref("const-2")]),
        atom("atom-objective", "atlas.expression.add", [ref("atom-3x"), ref("atom-2y")]),
        atom("atom-x-plus-y", "atlas.expression.add", [ref("var-x"), ref("var-y")]),
    ]
    ir["modelObjects"]["objectives"] = [
        {"id": "objective", "kind": "objective", "name": "Maximize", "objective": {"direction": "maximize", "terms": []}}
    ]
    ir["modelObjects"]["constraints"] = [
        constraint("constraint-sum", "<="),
        constraint("constraint-x-upper", "<="),
        constraint("constraint-y-upper", "<="),
        constraint("constraint-x-lower", ">="),
        constraint("constraint-y-lower", ">="),
    ]
    ir["modelObjects"]["problems"] = [{"id": "problem", "kind": "problem", "name": "Problem"}]
    ir["connections"] = [
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
        *[conn(f"problem-{item['id']}", item["id"], "problem", "constraints") for item in ir["modelObjects"]["constraints"]],
    ]
    return ir


def least_squares_ir(ridge: bool) -> dict:
    ir = base_ir("Ridge" if ridge else "Least squares")
    ir["modelObjects"]["variables"] = [{"id": "var-x", "kind": "variable", "name": "x", "shape": [2]}]
    ir["modelObjects"]["constants"] = [
        {"id": "const-A", "kind": "constant", "name": "A", "value": [[1, 0], [1, 1], [1, 2]]},
        {"id": "const-b", "kind": "constant", "name": "b", "value": [1, 2, 2]},
        {"id": "const-lambda", "kind": "constant", "name": "lambda", "value": 1},
    ]
    ir["modelObjects"]["atoms"] = [
        atom("atom-Ax", "atlas.expression.matmul", [ref("const-A"), ref("var-x")]),
        atom("atom-residual", "atlas.expression.subtract", [ref("atom-Ax"), ref("const-b")]),
        atom("atom-loss", "cvxpy.sum_squares", [ref("atom-residual")]),
    ]
    objective_source = "atom-loss"
    if ridge:
        ir["modelObjects"]["atoms"].extend(
            [
                atom("atom-penalty", "cvxpy.sum_squares", [ref("var-x")]),
                atom("atom-scaled-penalty", "atlas.expression.multiply", [ref("const-lambda"), ref("atom-penalty")]),
                atom("atom-ridge-objective", "atlas.expression.add", [ref("atom-loss"), ref("atom-scaled-penalty")]),
            ]
        )
        objective_source = "atom-ridge-objective"
    ir["modelObjects"]["objectives"] = [
        {"id": "objective", "kind": "objective", "name": "Minimize", "objective": {"direction": "minimize", "terms": []}}
    ]
    ir["modelObjects"]["problems"] = [{"id": "problem", "kind": "problem", "name": "Problem"}]
    ir["connections"] = [
        conn("objective-term", objective_source, "objective", "term0"),
        conn("problem-objective", "objective", "problem", "objective"),
    ]
    return ir


def atom(atom_id: str, import_path: str, inputs: list[dict]) -> dict:
    return {
        "id": atom_id,
        "kind": "atom",
        "name": atom_id,
        "atomName": atom_id,
        "displayName": atom_id,
        "importPath": import_path,
        "positionalInputs": inputs,
        "keywordInputs": {},
    }


def ref(object_id: str) -> dict:
    return {"id": f"input-{object_id}", "name": object_id, "kind": "reference", "objectId": object_id}


def constraint(constraint_id: str, operator: str) -> dict:
    return {"id": constraint_id, "kind": "constraint", "name": constraint_id, "constraint": {"operator": operator}}


def conn(conn_id: str, source: str, target: str, slot: str) -> dict:
    return {"id": conn_id, "source": {"objectId": source}, "target": {"objectId": target, "slot": slot}}
