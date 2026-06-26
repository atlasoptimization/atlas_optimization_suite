"""Tests for AtlasDesk semantic registries."""

from atlas_opt import AtlasDesk
from atlas_opt.schema import AtlasIR


def make_ir() -> AtlasIR:
    return AtlasIR.model_validate(
        {
            "metadata": {"name": "Test model"},
            "cards": [
                {
                    "id": "product-a",
                    "type": "object",
                    "title": "Product A",
                    "properties": [
                        {"id": "prop-cost", "name": "unit_cost", "kind": "constant", "value": 12}
                    ],
                },
                {
                    "id": "function-cost",
                    "type": "function",
                    "title": "Total cost",
                    "taggedSum": {"queryId": "query-products", "displayName": "Total cost"},
                },
                {
                    "id": "objective-cost",
                    "type": "objective",
                    "objective": {
                        "direction": "minimize",
                        "terms": [
                            {
                                "id": "term-cost",
                                "name": "Cost",
                                "functionCardId": "function-cost",
                            }
                        ],
                    },
                },
                {
                    "id": "constraint-missing",
                    "type": "constraint",
                    "constraint": {
                        "left": {"kind": "function_ref", "functionCardId": "missing-function"},
                        "operator": "<=",
                        "right": {"kind": "constant", "value": 100},
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


def test_build_atlas_desk_from_minimal_ir() -> None:
    desk = AtlasDesk.from_ir(AtlasIR())

    assert desk.cards == {}
    assert desk.queries == {}
    assert desk.metadata is not None


def test_card_lookup_works() -> None:
    desk = AtlasDesk.from_ir(make_ir())

    card = desk.get_card("product-a")
    assert card is not None
    assert card.title == "Product A"


def test_property_lookup_works() -> None:
    desk = AtlasDesk.from_ir(make_ir())

    prop = desk.get_property("product-a", "unit_cost")
    assert prop is not None
    assert prop.value == 12


def test_missing_card_returns_diagnostic() -> None:
    desk = AtlasDesk.from_ir(make_ir())

    assert desk.get_card("not-found") is None
    assert any("not-found" in diagnostic.message for diagnostic in desk.diagnostics)


def test_cards_by_type_work() -> None:
    desk = AtlasDesk.from_ir(make_ir())

    assert [card.id for card in desk.find_cards_by_type("object")] == ["product-a"]
    assert [card.id for card in desk.find_cards_by_type("function")] == ["function-cost"]


def test_from_ir_collects_missing_reference_diagnostics() -> None:
    desk = AtlasDesk.from_ir(make_ir())

    assert "objective-cost" in desk.objectives
    assert "constraint-missing" in desk.constraints
    assert any("missing-function" in diagnostic.message for diagnostic in desk.diagnostics)
