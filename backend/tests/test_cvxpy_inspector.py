"""Tests for CVXPY-backed graph metadata inspection."""

import pytest

from atlas_opt.cvxpy_inspector import inspect_cvxpy_metadata
from atlas_opt.schema import AtlasIR


def variable_ir() -> AtlasIR:
    """Return a minimal CVXPY-first variable graph."""

    return AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
            },
            "workspaceNodes": [
                {"id": "node-x", "modelObjectId": "var-x", "modelObjectKind": "variable"}
            ],
        }
    )


def norm_ir() -> AtlasIR:
    """Return x -> norm(x, 2)."""

    return AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                "constants": [{"id": "const-2", "kind": "constant", "name": "2", "value": 2}],
                "atoms": [
                    {
                        "id": "atom-norm",
                        "kind": "atom",
                        "name": "norm",
                        "atomId": "cvxpy.norm",
                    }
                ],
            },
            "workspaceNodes": [
                {"id": "node-x", "modelObjectId": "var-x", "modelObjectKind": "variable"},
                {"id": "node-2", "modelObjectId": "const-2", "modelObjectKind": "constant"},
                {"id": "node-norm", "modelObjectId": "atom-norm", "modelObjectKind": "atom"},
            ],
            "connections": [
                {
                    "id": "connection-x-norm",
                    "source": {"nodeId": "node-x", "objectId": "var-x", "port": "expression"},
                    "target": {"nodeId": "node-norm", "objectId": "atom-norm", "slot": "arg0"},
                },
                {
                    "id": "connection-2-norm",
                    "source": {"nodeId": "node-2", "objectId": "const-2", "port": "expression"},
                    "target": {"nodeId": "node-norm", "objectId": "atom-norm", "slot": "arg1"},
                },
            ],
        }
    )


def sum_squares_ir() -> AtlasIR:
    """Return x -> sum_squares(x)."""

    return AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                "atoms": [
                    {
                        "id": "atom-sum-squares",
                        "kind": "atom",
                        "name": "sum_squares",
                        "atomId": "cvxpy.sum_squares",
                    }
                ],
            },
            "workspaceNodes": [
                {"id": "node-x", "modelObjectId": "var-x", "modelObjectKind": "variable"},
                {
                    "id": "node-sum-squares",
                    "modelObjectId": "atom-sum-squares",
                    "modelObjectKind": "atom",
                },
            ],
            "connections": [
                {
                    "id": "connection-x-sum-squares",
                    "source": {"nodeId": "node-x", "objectId": "var-x", "port": "expression"},
                    "target": {
                        "nodeId": "node-sum-squares",
                        "objectId": "atom-sum-squares",
                        "slot": "arg0",
                    },
                }
            ],
        }
    )


def test_empty_ir_does_not_require_cvxpy() -> None:
    result = inspect_cvxpy_metadata(AtlasIR.model_validate({}))

    assert result.metadata == {}
    assert result.diagnostics == []


def test_variable_metadata_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(variable_ir())

    assert result.diagnostics == []
    assert result.metadata["var-x"]["shape"] == []
    assert result.metadata["var-x"]["curvature"] == "AFFINE"
    assert result.metadata["var-x"]["is_dcp"] is True
    assert result.metadata["node-x"]["curvature"] == "AFFINE"


def test_norm_metadata_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(norm_ir())

    assert result.diagnostics == []
    assert result.metadata["atom-norm"]["shape"] == []
    assert result.metadata["atom-norm"]["sign"] == "NONNEGATIVE"
    assert result.metadata["atom-norm"]["curvature"] == "CONVEX"
    assert result.metadata["atom-norm"]["is_dcp"] is True


def test_sum_squares_metadata_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(sum_squares_ir())

    assert result.diagnostics == []
    assert result.metadata["atom-sum-squares"]["shape"] == []
    assert result.metadata["atom-sum-squares"]["sign"] == "NONNEGATIVE"
    assert result.metadata["atom-sum-squares"]["curvature"] == "CONVEX"
    assert result.metadata["atom-sum-squares"]["is_dcp"] is True


def test_incomplete_atom_diagnostic_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    ir = AtlasIR.model_validate(
        {
            "modelObjects": {
                "atoms": [{"id": "atom-norm", "kind": "atom", "name": "norm", "atomId": "cvxpy.norm"}]
            },
            "workspaceNodes": [
                {"id": "node-norm", "modelObjectId": "atom-norm", "modelObjectKind": "atom"}
            ],
        }
    )
    result = inspect_cvxpy_metadata(ir)

    assert any("incomplete" in diagnostic.message for diagnostic in result.diagnostics)


def test_dcp_invalid_expression_diagnostic_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    ir = AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                "atoms": [
                    {"id": "atom-square-a", "kind": "atom", "name": "square", "atomId": "cvxpy.square"},
                    {"id": "atom-square-b", "kind": "atom", "name": "square", "atomId": "cvxpy.square"},
                ],
            },
            "workspaceNodes": [
                {"id": "node-x", "modelObjectId": "var-x", "modelObjectKind": "variable"},
                {"id": "node-a", "modelObjectId": "atom-square-a", "modelObjectKind": "atom"},
                {"id": "node-b", "modelObjectId": "atom-square-b", "modelObjectKind": "atom"},
            ],
            "connections": [
                {
                    "id": "connection-x-a",
                    "source": {"nodeId": "node-x", "objectId": "var-x", "port": "expression"},
                    "target": {"nodeId": "node-a", "objectId": "atom-square-a", "slot": "arg0"},
                },
                {
                    "id": "connection-a-b",
                    "source": {"nodeId": "node-a", "objectId": "atom-square-a", "port": "expression"},
                    "target": {"nodeId": "node-b", "objectId": "atom-square-b", "slot": "arg0"},
                },
            ],
        }
    )
    result = inspect_cvxpy_metadata(ir)

    assert result.metadata["atom-square-b"]["is_dcp"] is False
    assert any("not DCP" in diagnostic.message for diagnostic in result.diagnostics)
