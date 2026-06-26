"""Tests for Python typed-tag query evaluation."""

from atlas_opt import AtlasDesk
from atlas_opt.queries import collect_available_property_names, detect_missing_properties
from atlas_opt.schema import AtlasIR


def make_query_desk() -> AtlasDesk:
    return AtlasDesk.from_ir(
        AtlasIR.model_validate(
            {
                "cards": [
                    {
                        "id": "product-a",
                        "type": "object",
                        "title": "Product A",
                        "tags": [
                            {"id": "tag-type-a", "key": "type", "value": "product"},
                            {"id": "tag-factory-a", "key": "factory", "value": "A"},
                        ],
                        "properties": [
                            {"id": "prop-cost-a", "name": "unit_cost", "value": 12},
                            {"id": "prop-demand-a", "name": "demand", "value": 20},
                        ],
                    },
                    {
                        "id": "product-b",
                        "type": "object",
                        "title": "Product B",
                        "tags": [
                            {"id": "tag-type-b", "key": "type", "value": "product"},
                            {"id": "tag-factory-b", "key": "factory", "value": "B"},
                        ],
                        "properties": [
                            {"id": "prop-cost-b", "name": "unit_cost", "value": 10},
                        ],
                    },
                    {
                        "id": "data-card",
                        "type": "data",
                        "tags": [{"id": "tag-type-data", "key": "type", "value": "data"}],
                    },
                    {"id": "untagged", "type": "object"},
                ],
                "queries": [
                    {
                        "id": "query-products",
                        "includeTags": [{"id": "cond-type", "key": "type", "value": "product"}],
                    },
                    {
                        "id": "query-factory-a-products",
                        "includeTags": [
                            {"id": "cond-type-a", "key": "type", "value": "product"},
                            {"id": "cond-factory-a", "key": "factory", "value": "A"},
                        ],
                    },
                    {
                        "id": "query-active-products",
                        "includeTags": [{"id": "cond-type-active", "key": "type", "value": "product"}],
                        "excludeTags": [{"id": "cond-factory-b", "key": "factory", "value": "B"}],
                    },
                    {
                        "id": "query-no-match",
                        "includeTags": [{"id": "cond-type-x", "key": "type", "value": "warehouse"}],
                    },
                    {"id": "query-empty", "name": "Everything"},
                ],
            }
        )
    )


def test_include_one_tag() -> None:
    result = make_query_desk().evaluate_query("query-products")

    assert result.matched_card_ids == ["product-a", "product-b"]


def test_include_multiple_tags() -> None:
    result = make_query_desk().evaluate_query("query-factory-a-products")

    assert result.matched_card_ids == ["product-a"]


def test_exclude_tag() -> None:
    result = make_query_desk().evaluate_query("query-active-products")

    assert result.matched_card_ids == ["product-a"]


def test_no_matches() -> None:
    result = make_query_desk().evaluate_query("query-no-match")

    assert result.matched_card_ids == []


def test_missing_tags_do_not_match_include_conditions() -> None:
    result = make_query_desk().evaluate_query("query-products")

    assert "untagged" not in result.matched_card_ids


def test_empty_query_matches_all_cards_by_documented_choice() -> None:
    result = make_query_desk().evaluate_query("query-empty")

    assert result.matched_card_ids == ["product-a", "product-b", "data-card", "untagged"]


def test_available_properties_among_matches() -> None:
    result = make_query_desk().evaluate_query("query-products")

    assert collect_available_property_names(result) == ["demand", "unit_cost"]


def test_missing_property_diagnostics() -> None:
    result = make_query_desk().evaluate_query("query-products")
    diagnostics = detect_missing_properties(result, ["demand"])

    assert len(diagnostics) == 1
    assert "product-b" in diagnostics[0].message
