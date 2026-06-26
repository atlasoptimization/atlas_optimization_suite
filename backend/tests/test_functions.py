"""Tests for semantic TaggedSum functions."""

from atlas_opt import AtlasDesk
from atlas_opt.schema import AtlasIR


def make_tagged_sum_desk(include_missing: bool = False) -> AtlasDesk:
    product_c_properties = [
        {"id": "prop-cost-c", "name": "unit_cost", "value": 5},
        {"id": "prop-qty-c", "name": "production_quantity", "value": 4},
    ]
    if include_missing:
        product_c_properties = [{"id": "prop-cost-c", "name": "unit_cost", "value": 5}]

    return AtlasDesk.from_ir(
        AtlasIR.model_validate(
            {
                "cards": [
                    {
                        "id": "product-a",
                        "type": "object",
                        "tags": [
                            {"id": "tag-type-a", "key": "type", "value": "product"},
                            {"id": "tag-factory-a", "key": "factory", "value": "A"},
                        ],
                        "properties": [
                            {"id": "prop-cost-a", "name": "unit_cost", "value": 10},
                            {"id": "prop-qty-a", "name": "production_quantity", "value": 2},
                        ],
                    },
                    {
                        "id": "product-b",
                        "type": "object",
                        "tags": [
                            {"id": "tag-type-b", "key": "type", "value": "product"},
                            {"id": "tag-factory-b", "key": "factory", "value": "B"},
                        ],
                        "properties": [
                            {"id": "prop-cost-b", "name": "unit_cost", "value": 8},
                            {"id": "prop-qty-b", "name": "production_quantity", "value": 3},
                        ],
                    },
                    {
                        "id": "product-c",
                        "type": "object",
                        "tags": [
                            {"id": "tag-type-c", "key": "type", "value": "product"},
                            {"id": "tag-factory-c", "key": "factory", "value": "A"},
                        ],
                        "properties": product_c_properties,
                    },
                    {
                        "id": "function-total-cost",
                        "type": "function",
                        "title": "Total cost",
                        "taggedSum": {
                            "queryId": "query-products",
                            "displayName": "Total cost",
                            "expression": {
                                "kind": "multiply",
                                "left": {"kind": "property_ref", "propertyName": "unit_cost"},
                                "right": {
                                    "kind": "property_ref",
                                    "propertyName": "production_quantity",
                                },
                            },
                        },
                    },
                    {
                        "id": "function-factory-a-cost",
                        "type": "function",
                        "title": "Factory A cost",
                        "taggedSum": {
                            "queryId": "query-factory-a",
                            "displayName": "Factory A cost",
                            "expression": {
                                "kind": "multiply",
                                "left": {"kind": "property_ref", "propertyName": "unit_cost"},
                                "right": {
                                    "kind": "property_ref",
                                    "propertyName": "production_quantity",
                                },
                            },
                        },
                    },
                ],
                "queries": [
                    {
                        "id": "query-products",
                        "includeTags": [{"id": "cond-type", "key": "type", "value": "product"}],
                    },
                    {
                        "id": "query-factory-a",
                        "includeTags": [
                            {"id": "cond-type-a", "key": "type", "value": "product"},
                            {"id": "cond-factory-a", "key": "factory", "value": "A"},
                        ],
                    },
                ],
            }
        )
    )


def test_tagged_sum_over_three_product_cards() -> None:
    result = make_tagged_sum_desk().evaluate_function("function-total-cost")

    assert result.value == 64
    assert result.diagnostics == []


def test_query_selects_subset() -> None:
    result = make_tagged_sum_desk().evaluate_function("function-factory-a-cost")

    assert result.value == 40


def test_expression_unit_cost_times_production_quantity() -> None:
    result = make_tagged_sum_desk().evaluate_function("function-total-cost")

    assert result.value == 10 * 2 + 8 * 3 + 5 * 4


def test_missing_property_diagnostic() -> None:
    result = make_tagged_sum_desk(include_missing=True).evaluate_function("function-total-cost")

    assert result.value == 44
    assert any("production_quantity" in diagnostic.message for diagnostic in result.diagnostics)


def test_symbolic_preview() -> None:
    desk = make_tagged_sum_desk()

    assert desk.functions["function-factory-a-cost"].symbolic(desk) == (
        "Σ(unit_cost * production_quantity | type=product, factory=A)"
    )


def test_dependency_list() -> None:
    desk = make_tagged_sum_desk()
    dependencies = desk.functions["function-factory-a-cost"].dependencies(desk)

    assert [(dep.card_id, dep.property_name) for dep in dependencies] == [
        ("product-a", "unit_cost"),
        ("product-a", "production_quantity"),
        ("product-c", "unit_cost"),
        ("product-c", "production_quantity"),
    ]
