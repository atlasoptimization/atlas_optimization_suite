"""Tests for semantic objectives, constraints, KPIs, and reports."""

from atlas_opt import AtlasDesk
from atlas_opt.expressions import Expression
from atlas_opt.kpis import KPI
from atlas_opt.reports import Report
from atlas_opt.schema import AtlasIR


def make_semantic_desk(two_functions: bool = False) -> AtlasDesk:
    function_cards = [
        {
            "id": "function-cost",
            "type": "function",
            "title": "Total cost",
            "taggedSum": {
                "queryId": "query-products",
                "displayName": "Total cost",
                "expression": {
                    "kind": "multiply",
                    "left": {"kind": "property_ref", "propertyName": "unit_cost"},
                    "right": {"kind": "property_ref", "propertyName": "quantity"},
                },
            },
        }
    ]
    terms = [{"id": "term-cost", "name": "Cost", "functionCardId": "function-cost"}]
    if two_functions:
        function_cards.append(
            {
                "id": "function-revenue",
                "type": "function",
                "title": "Total revenue",
                "taggedSum": {
                    "queryId": "query-products",
                    "displayName": "Total revenue",
                    "expression": {
                        "kind": "multiply",
                        "left": {"kind": "property_ref", "propertyName": "unit_price"},
                        "right": {"kind": "property_ref", "propertyName": "quantity"},
                    },
                },
            }
        )
        terms.append({"id": "term-revenue", "name": "Revenue", "functionCardId": "function-revenue"})

    return AtlasDesk.from_ir(
        AtlasIR.model_validate(
            {
                "cards": [
                    {
                        "id": "product-a",
                        "type": "object",
                        "tags": [{"id": "tag-type", "key": "type", "value": "product"}],
                        "properties": [
                            {"id": "prop-cost", "name": "unit_cost", "value": 4},
                            {"id": "prop-price", "name": "unit_price", "value": 7},
                            {"id": "prop-qty", "name": "quantity", "value": 3},
                        ],
                    },
                    *function_cards,
                    {
                        "id": "objective-card",
                        "type": "objective",
                        "objective": {"direction": "minimize", "terms": terms},
                    },
                    {
                        "id": "constraint-card",
                        "type": "constraint",
                        "constraint": {
                            "name": "Budget",
                            "left": {"kind": "function_ref", "functionCardId": "function-cost"},
                            "operator": "<=",
                            "right": {"kind": "constant", "value": 20},
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
        )
    )


def test_objective_with_one_tagged_sum_term() -> None:
    desk = make_semantic_desk()

    assert desk.evaluate_objective("objective-card").value == 12
    assert desk.objectives["objective-card"].symbolic(desk).startswith("min Σ(")


def test_objective_with_two_terms() -> None:
    desk = make_semantic_desk(two_functions=True)

    assert desk.evaluate_objective("objective-card").value == 33


def test_constraint_left_right_evaluation() -> None:
    desk = make_semantic_desk()
    result = desk.evaluate_constraint("constraint-card")

    assert result.left == 12
    assert result.right == 20
    assert result.satisfied is True


def test_constraint_residual_and_activity() -> None:
    desk = make_semantic_desk()
    result = desk.evaluate_constraint("constraint-card")

    assert result.residual == -8
    assert result.active is False


def test_kpi_evaluation() -> None:
    desk = make_semantic_desk()
    desk.kpis["kpi-cost"] = KPI(
        "kpi-cost",
        "Total cost KPI",
        Expression("function_ref", function_card_id="function-cost"),
    )

    assert desk.evaluate_kpi("kpi-cost").value == 12


def test_report_summary_contains_expected_sections() -> None:
    desk = make_semantic_desk()
    desk.kpis["kpi-cost"] = KPI(
        "kpi-cost",
        "Total cost KPI",
        Expression("function_ref", function_card_id="function-cost"),
    )
    summary = Report(desk).summary()

    assert set(summary) == {"objectives", "constraints", "kpis", "diagnostics"}
    assert summary["objectives"]["objective-card"]["value"] == 12
    assert summary["constraints"]["constraint-card"]["residual"] == -8
    assert summary["kpis"]["kpi-cost"]["value"] == 12
