"""Tests for AtlasOptimizer and thin FastAPI routes."""

import pytest

from atlas_opt.optimizer import AtlasOptimizer


def minimal_ir() -> dict:
    return {
        "cards": [
            {
                "id": "product-a",
                "type": "object",
                "tags": [{"id": "tag-type", "key": "type", "value": "product"}],
                "properties": [
                    {"id": "prop-cost", "name": "unit_cost", "value": 5},
                    {"id": "prop-qty", "name": "quantity", "value": 2},
                ],
            },
            {
                "id": "function-cost",
                "type": "function",
                "taggedSum": {
                    "queryId": "query-products",
                    "displayName": "Total cost",
                    "expression": {
                        "kind": "multiply",
                        "left": {"kind": "property_ref", "propertyName": "unit_cost"},
                        "right": {"kind": "property_ref", "propertyName": "quantity"},
                    },
                },
            },
            {
                "id": "objective-card",
                "type": "objective",
                "objective": {
                    "direction": "minimize",
                    "terms": [{"id": "term-cost", "name": "Cost", "functionCardId": "function-cost"}],
                },
            },
        ],
        "queries": [
            {
                "id": "query-products",
                "includeTags": [{"id": "cond-type", "key": "type", "value": "product"}],
            }
        ],
    }


def test_optimizer_validate() -> None:
    response = AtlasOptimizer.from_ir(minimal_ir()).validate()

    assert response["diagnostics"] == []


def test_optimizer_evaluate_returns_semantic_summary() -> None:
    response = AtlasOptimizer.from_ir(minimal_ir()).evaluate()

    assert response["functions"]["function-cost"]["value"] == 10
    assert response["objectives"]["objective-card"]["value"] == 10
    assert "report" in response


def test_backend_evaluator_uses_solution_runtime_values() -> None:
    ir = minimal_ir()
    ir["cards"].append({"id": "decision-production", "type": "decision"})
    ir["cards"][0]["properties"][1] = {
        "id": "prop-qty",
        "name": "quantity",
        "kind": "decision_ref",
        "value": "decision-production",
    }
    optimizer = AtlasOptimizer.from_ir(ir)

    result = optimizer.desk.evaluate_function(
        "function-cost",
        runtime_values={"decision-production": 4},
    )

    assert result.value == 20


def test_backend_evaluator_reads_data_ref_preview_value() -> None:
    ir = {
        "cards": [
            {
                "id": "demand-data",
                "type": "data",
                "data": {
                    "fileName": "Demand.csv",
                    "columns": ["demand"],
                    "rowCount": 1,
                    "previewRows": [{"demand": "7"}],
                },
            },
            {
                "id": "product-a",
                "type": "object",
                "tags": [{"id": "tag-type", "key": "type", "value": "product"}],
                "properties": [
                    {
                        "id": "prop-demand",
                        "name": "demand",
                        "kind": "data_ref",
                        "value": {"dataCardId": "demand-data", "column": "demand"},
                    }
                ],
            },
            {
                "id": "function-demand",
                "type": "function",
                "taggedSum": {
                    "queryId": "query-products",
                    "displayName": "Demand",
                    "expression": {"kind": "property_ref", "propertyName": "demand"},
                },
            },
        ],
        "queries": [
            {
                "id": "query-products",
                "includeTags": [{"id": "cond-type", "key": "type", "value": "product"}],
            }
        ],
    }

    response = AtlasOptimizer.from_ir(ir).evaluate()

    assert response["functions"]["function-demand"]["value"] == 7


def test_optimizer_solve_not_implemented() -> None:
    response = AtlasOptimizer.from_ir(minimal_ir()).solve()

    assert response["status"] in {"not_available", "optimal", "optimal_inaccurate"}
    if response["status"] == "not_available":
        assert "cvxpy" in response["diagnostics"][0]["message"].lower()


def test_optimizer_generate_code_returns_cvxpy_code() -> None:
    response = AtlasOptimizer.from_ir(minimal_ir()).generate_code()

    assert "import cvxpy as cp" in response["code"]
    assert "problem = cp.Problem" in response["code"]


def test_binary_decision_metadata_generates_binary_variable_code() -> None:
    ir = minimal_ir()
    ir["cards"].append(
        {
            "id": "decision-open",
            "type": "decision",
            "decision": {"variableType": "binary", "shape": "scalar"},
        }
    )

    response = AtlasOptimizer.from_ir(ir).generate_code()

    assert 'cp.Variable(boolean=True, name="decision-open")' in response["code"]


def test_indexed_property_metadata_validates_and_warns_for_scalar_compile() -> None:
    pytest.importorskip("cvxpy")
    ir = minimal_ir()
    ir["cards"].insert(
        0,
        {
            "id": "weeks",
            "type": "data",
            "data": {
                "fileName": "Weeks.index",
                "columns": [],
                "rowCount": 0,
                "previewRows": [],
                "indexSet": {"name": "Weeks", "elements": ["1", "2", "3"]},
            },
        },
    )
    ir["cards"][1]["properties"][1]["indexSetId"] = "weeks"

    response = AtlasOptimizer.from_ir(ir).solve()

    assert any("indexed by" in diagnostic["message"] for diagnostic in response["diagnostics"])


def test_invalid_decision_bounds_return_diagnostic_when_cvxpy_available() -> None:
    pytest.importorskip("cvxpy")
    ir = minimal_ir()
    ir["cards"].append(
        {
            "id": "decision-bad",
            "type": "decision",
            "decision": {"variableType": "continuous", "lowerBound": 10, "upperBound": 1},
        }
    )

    response = AtlasOptimizer.from_ir(ir).solve()

    assert any("lowerBound" in diagnostic["message"] for diagnostic in response["diagnostics"])


def test_invalid_model_reference_returns_diagnostics() -> None:
    ir = minimal_ir()
    ir["cards"][2]["objective"]["terms"][0]["functionCardId"] = "missing-function"

    validation = AtlasOptimizer.from_ir(ir).validate()
    evaluation = AtlasOptimizer.from_ir(ir).evaluate()

    assert validation["diagnostics"]
    assert evaluation["objectives"]["objective-card"]["diagnostics"]


def test_nonlinear_property_product_returns_diagnostic() -> None:
    ir = minimal_ir()
    ir["cards"][0]["properties"] = [
        {"id": "prop-a", "name": "a", "kind": "decision_ref", "value": "decision-a"},
        {"id": "prop-b", "name": "b", "kind": "decision_ref", "value": "decision-b"},
    ]
    ir["cards"][1]["taggedSum"]["expression"] = {
        "kind": "multiply",
        "left": {"kind": "property_ref", "propertyName": "a"},
        "right": {"kind": "property_ref", "propertyName": "b"},
    }

    response = AtlasOptimizer.from_ir(ir).evaluate()

    assert any(
        "nonlinear" in diagnostic["message"]
        for diagnostic in response["functions"]["function-cost"]["diagnostics"]
    )


def test_minimal_lp_solve_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")
    ir = minimal_ir()
    ir["cards"].append({"id": "decision-production", "type": "decision"})
    ir["cards"][0]["properties"][1] = {
        "id": "prop-qty",
        "name": "quantity",
        "kind": "decision_ref",
        "value": "decision-production",
    }
    ir["cards"].append(
        {
            "id": "constraint-capacity",
            "type": "constraint",
            "constraint": {
                "left": {"kind": "function_ref", "functionCardId": "function-cost"},
                "operator": ">=",
                "right": {"kind": "constant", "value": 10},
            },
        }
    )

    response = AtlasOptimizer.from_ir(ir).solve()

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["objectiveValue"] is not None
    assert "decision-production" in response["variableValues"]
    assert "constraint-capacity" in response["constraints"]


def production_example_ir() -> dict:
    products = [
        ("product-alpha", 8, 2, "decision-alpha"),
        ("product-beta", 12, 3, "decision-beta"),
        ("product-gamma", 15, 5, "decision-gamma"),
    ]
    cards = [
        {
            "id": product_id,
            "type": "object",
            "tags": [
                {"id": f"{product_id}-type", "key": "type", "value": "product"},
                {"id": f"{product_id}-factory", "key": "factory", "value": "A"},
            ],
            "properties": [
                {"id": f"{product_id}-profit", "name": "unit_profit", "kind": "constant", "value": profit},
                {
                    "id": f"{product_id}-hours",
                    "name": "machine_hours_per_unit",
                    "kind": "constant",
                    "value": hours,
                },
                {
                    "id": f"{product_id}-quantity",
                    "name": "production_quantity",
                    "kind": "decision_ref",
                    "value": decision_id,
                },
            ],
        }
        for product_id, profit, hours, decision_id in products
    ]
    cards.extend({"id": decision_id, "type": "decision"} for _, _, _, decision_id in products)
    cards.extend(
        [
            {
                "id": "function-profit",
                "type": "function",
                "taggedSum": {
                    "queryId": "query-products-factory-a",
                    "displayName": "Total profit",
                    "expression": {
                        "kind": "multiply",
                        "left": {"kind": "property_ref", "propertyName": "unit_profit"},
                        "right": {"kind": "property_ref", "propertyName": "production_quantity"},
                    },
                },
            },
            {
                "id": "function-hours",
                "type": "function",
                "taggedSum": {
                    "queryId": "query-products-factory-a",
                    "displayName": "Machine hours",
                    "expression": {
                        "kind": "multiply",
                        "left": {"kind": "property_ref", "propertyName": "machine_hours_per_unit"},
                        "right": {"kind": "property_ref", "propertyName": "production_quantity"},
                    },
                },
            },
            {
                "id": "objective-profit",
                "type": "objective",
                "objective": {
                    "direction": "maximize",
                    "terms": [
                        {"id": "term-profit", "name": "Profit", "functionCardId": "function-profit"}
                    ],
                },
            },
            {
                "id": "constraint-capacity",
                "type": "constraint",
                "constraint": {
                    "left": {"kind": "function_ref", "functionCardId": "function-hours"},
                    "operator": "<=",
                    "right": {"kind": "constant", "value": 40},
                },
            },
        ]
    )
    return {
        "cards": cards,
        "queries": [
            {
                "id": "query-products-factory-a",
                "includeTags": [
                    {"id": "cond-product", "key": "type", "value": "product"},
                    {"id": "cond-factory", "key": "factory", "value": "A"},
                ],
            }
        ],
    }


def test_production_example_solves_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    response = AtlasOptimizer.from_ir(production_example_ir()).solve()

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["objectiveValue"] is not None
    assert response["constraints"]["constraint-capacity"]["satisfied"] is True


def test_fastapi_endpoints_if_fastapi_is_installed() -> None:
    pytest.importorskip("fastapi")
    pytest.importorskip("httpx")
    from fastapi.testclient import TestClient

    from atlas_api import app

    client = TestClient(app)

    health_response = client.get("/health")
    assert health_response.status_code == 200
    assert health_response.json()["status"] == "ok"

    validate_response = client.post("/validate", json=minimal_ir())
    assert validate_response.status_code == 200
    assert validate_response.json()["diagnostics"] == []

    evaluate_response = client.post("/evaluate", json=minimal_ir())
    assert evaluate_response.status_code == 200
    assert evaluate_response.json()["objectives"]["objective-card"]["value"] == 10

    solve_response = client.post("/solve", json=minimal_ir())
    assert solve_response.status_code == 200
    assert "status" in solve_response.json()

    invalid_response = client.post("/validate", json={"cards": [{"type": "object"}]})
    assert invalid_response.status_code == 422
