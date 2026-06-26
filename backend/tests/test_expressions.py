"""Tests for structured Python expression AST and evaluator."""

from atlas_opt import AtlasDesk
from atlas_opt.evaluator import evaluate_expression
from atlas_opt.expressions import Expression
from atlas_opt.schema import AtlasIR


def make_expression_desk() -> AtlasDesk:
    return AtlasDesk.from_ir(
        AtlasIR.model_validate(
            {
                "cards": [
                    {
                        "id": "product-a",
                        "type": "object",
                        "title": "Product A",
                        "properties": [
                            {"id": "prop-cost", "name": "unit_cost", "value": 12},
                            {"id": "prop-name", "name": "label", "value": "not-number"},
                        ],
                    }
                ]
            }
        )
    )


def test_literal_evaluation() -> None:
    result = evaluate_expression(Expression("literal", value=7), make_expression_desk())

    assert result.value == 7
    assert result.diagnostics == []


def test_property_reference_evaluation() -> None:
    desk = make_expression_desk()
    card = desk.cards["product-a"]
    result = evaluate_expression(Expression("property_ref", property_name="unit_cost"), desk, card)

    assert result.value == 12
    assert result.dependencies[0].property_name == "unit_cost"


def test_multiply_constant_by_property() -> None:
    desk = make_expression_desk()
    card = desk.cards["product-a"]
    expression = Expression(
        "multiply",
        left=Expression("literal", value=2),
        right=Expression("property_ref", property_name="unit_cost"),
    )

    assert evaluate_expression(expression, desk, card).value == 24


def test_add_terms() -> None:
    expression = Expression("add", terms=(Expression("literal", value=2), Expression("literal", value=3)))

    assert evaluate_expression(expression, make_expression_desk()).value == 5


def test_missing_property() -> None:
    desk = make_expression_desk()
    card = desk.cards["product-a"]
    result = evaluate_expression(Expression("property_ref", property_name="demand"), desk, card)

    assert result.value is None
    assert "missing property" in result.diagnostics[0].message


def test_non_numeric_value_diagnostics() -> None:
    desk = make_expression_desk()
    card = desk.cards["product-a"]
    result = evaluate_expression(Expression("property_ref", property_name="label"), desk, card)

    assert result.value is None
    assert "not numeric" in result.diagnostics[0].message


def test_dependency_extraction() -> None:
    expression = Expression(
        "multiply",
        left=Expression("property_ref", property_name="unit_cost"),
        right=Expression("function_ref", function_card_id="function-total"),
    )
    dependencies = expression.dependencies("product-a")

    assert dependencies[0].card_id == "product-a"
    assert dependencies[0].property_name == "unit_cost"
    assert dependencies[1].function_card_id == "function-total"
