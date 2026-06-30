"""Tests for raw Atlas IR Pydantic schema models."""

import pytest
from pydantic import ValidationError

from atlas_opt.schema import AtlasIR


def test_minimal_valid_ir() -> None:
    ir = AtlasIR.model_validate({})

    assert ir.schemaVersion == "0.2-cvxpy"
    assert ir.cards == []
    assert ir.modelObjects.variables == []
    assert ir.model_dump()["schemaVersion"] == "0.2-cvxpy"


def test_cvxpy_first_ir_allows_two_workspace_nodes_for_one_variable() -> None:
    ir = AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [
                    {
                        "id": "var-x",
                        "kind": "variable",
                        "name": "x",
                        "decision": {"variableType": "continuous", "shape": "scalar"},
                    }
                ]
            },
            "workspaceNodes": [
                {
                    "id": "node-x-main",
                    "modelObjectId": "var-x",
                    "modelObjectKind": "variable",
                    "position": {"x": 10, "y": 20},
                },
                {
                    "id": "node-x-ref",
                    "modelObjectId": "var-x",
                    "modelObjectKind": "variable",
                    "position": {"x": 200, "y": 20},
                },
            ],
        }
    )

    assert len(ir.modelObjects.variables) == 1
    assert [node.modelObjectId for node in ir.workspaceNodes] == ["var-x", "var-x"]


def test_duplicate_model_object_id_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="Duplicate model object id"):
        AtlasIR.model_validate(
            {
                "modelObjects": {
                    "variables": [{"id": "shared", "kind": "variable", "name": "x"}],
                    "constants": [{"id": "shared", "kind": "constant", "name": "c"}],
                }
            }
        )


def test_workspace_node_missing_model_object_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="references missing model object"):
        AtlasIR.model_validate(
            {
                "workspaceNodes": [
                    {
                        "id": "node-missing",
                        "modelObjectId": "var-missing",
                        "modelObjectKind": "variable",
                    }
                ]
            }
        )


def test_connection_missing_endpoint_raises_validation_error() -> None:
    with pytest.raises(ValidationError, match="missing workspace node"):
        AtlasIR.model_validate(
            {
                "modelObjects": {
                    "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                    "constants": [{"id": "const-one", "kind": "constant", "name": "one"}],
                },
                "workspaceNodes": [
                    {
                        "id": "node-x",
                        "modelObjectId": "var-x",
                        "modelObjectKind": "variable",
                    }
                ],
                "connections": [
                    {
                        "id": "connection-bad",
                        "source": {"nodeId": "node-missing"},
                        "target": {"objectId": "const-one"},
                    }
                ],
            }
        )


def test_generic_atom_object_ir() -> None:
    ir = AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                "atoms": [
                    {
                        "id": "atom-norm",
                        "kind": "atom",
                        "name": "norm",
                        "atomName": "norm",
                        "importPath": "cvxpy.norm",
                        "displayName": "norm",
                        "positionalInputs": [
                            {
                                "id": "arg_0",
                                "name": "x",
                                "kind": "reference",
                                "objectId": "var-x",
                            }
                        ],
                        "keywordInputs": {
                            "p": {"id": "kw_p", "name": "p", "kind": "literal", "value": 2}
                        },
                        "outputName": "expression",
                        "metadata": {"signature": "(x, p=2)"},
                    }
                ],
            },
        }
    )

    atom = ir.modelObjects.atoms[0]
    assert atom.atomName == "norm"
    assert atom.importPath == "cvxpy.norm"
    assert atom.positionalInputs[0]["objectId"] == "var-x"
    assert atom.keywordInputs["p"]["value"] == 2


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
