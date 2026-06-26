"""Tests for raw Atlas IR Pydantic schema models."""

import pytest
from pydantic import ValidationError

from atlas_opt.schema import AtlasIR


def test_minimal_valid_ir() -> None:
    ir = AtlasIR.model_validate({})

    assert ir.schemaVersion == "0.1"
    assert ir.cards == []
    assert ir.model_dump()["schemaVersion"] == "0.1"


def test_card_with_tags_and_properties() -> None:
    ir = AtlasIR.model_validate(
        {
            "cards": [
                {
                    "id": "card-product",
                    "type": "object",
                    "title": "Product",
                    "tags": [{"id": "tag-type", "key": "type", "value": "product"}],
                    "properties": [
                        {
                            "id": "prop-cost",
                            "name": "unit_cost",
                            "kind": "constant",
                            "value": 12,
                            "unit": "USD",
                        }
                    ],
                }
            ]
        }
    )

    card = ir.cards[0]
    assert card.id == "card-product"
    assert card.tags[0].key == "type"
    assert card.properties[0].name == "unit_cost"


def test_query_ir() -> None:
    ir = AtlasIR.model_validate(
        {
            "queries": [
                {
                    "id": "query-products",
                    "name": "Products",
                    "includeTags": [{"id": "cond-type", "key": "type", "value": "product"}],
                    "excludeTags": [{"id": "cond-status", "key": "status", "value": "inactive"}],
                }
            ]
        }
    )

    assert ir.queries[0].includeTags[0].value == "product"
    assert ir.queries[0].excludeTags[0].key == "status"


def test_tagged_sum_function_ir() -> None:
    ir = AtlasIR.model_validate(
        {
            "cards": [
                {
                    "id": "function-total-cost",
                    "type": "function",
                    "functionKind": "tagged_sum",
                    "taggedSum": {
                        "queryId": "query-products",
                        "displayName": "Total cost",
                        "expression": {
                            "kind": "multiply",
                            "left": {
                                "kind": "property_ref",
                                "queryId": "query-products",
                                "propertyName": "unit_cost",
                            },
                            "right": {
                                "kind": "property_ref",
                                "queryId": "query-products",
                                "propertyName": "production_quantity",
                            },
                        },
                    },
                }
            ]
        }
    )

    tagged_sum = ir.cards[0].taggedSum
    assert tagged_sum is not None
    assert tagged_sum.displayName == "Total cost"
    assert tagged_sum.expression is not None
    assert tagged_sum.expression.kind == "multiply"


def test_objective_and_constraint_ir() -> None:
    ir = AtlasIR.model_validate(
        {
            "cards": [
                {
                    "id": "objective-cost",
                    "type": "objective",
                    "objective": {
                        "direction": "minimize",
                        "terms": [
                            {
                                "id": "term-cost",
                                "name": "Cost",
                                "functionCardId": "function-total-cost",
                            }
                        ],
                    },
                },
                {
                    "id": "constraint-capacity",
                    "type": "constraint",
                    "constraint": {
                        "name": "Capacity",
                        "left": {"kind": "function_ref", "functionCardId": "function-hours"},
                        "operator": "<=",
                        "right": {"kind": "constant", "value": 100},
                    },
                },
            ]
        }
    )

    assert ir.cards[0].objective is not None
    assert ir.cards[0].objective.terms[0].functionCardId == "function-total-cost"
    assert ir.cards[1].constraint is not None
    assert ir.cards[1].constraint.operator == "<="


def test_invalid_card_type_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="type"):
        AtlasIR.model_validate({"cards": [{"id": "card-bad", "type": "bad"}]})


def test_missing_required_card_id_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="id"):
        AtlasIR.model_validate({"cards": [{"type": "object"}]})
