"""Tests for CVXPY-backed graph metadata inspection."""

import pytest

from atlas_opt.cvxpy_inspector import inspect_cvxpy_metadata, resolve_registered_cvxpy_callable
from atlas_opt.schema import AtlasIR


def generic_atom_ir(atom_name: str, import_path: str, positional_inputs: list[dict], keyword_inputs: dict | None = None) -> AtlasIR:
    """Return a generic AtomObject IR with one variable x."""

    return AtlasIR.model_validate(
        {
            "modelObjects": {
                "variables": [{"id": "var-x", "kind": "variable", "name": "x"}],
                "atoms": [
                    {
                        "id": f"atom-{atom_name}",
                        "kind": "atom",
                        "name": atom_name,
                        "atomName": atom_name,
                        "importPath": import_path,
                        "displayName": atom_name,
                        "positionalInputs": positional_inputs,
                        "keywordInputs": keyword_inputs or {},
                    }
                ],
            },
        }
    )


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


def test_resolver_only_accepts_registered_import_paths() -> None:
    class FakeCvxpy:
        @staticmethod
        def norm(x):
            return x

    assert callable(resolve_registered_cvxpy_callable(FakeCvxpy, "cvxpy.norm", {"cvxpy.norm"}, {"norm"}))
    assert resolve_registered_cvxpy_callable(FakeCvxpy, "os.system", {"cvxpy.norm"}, {"norm"}) is None


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
                    {"id": "atom-product", "kind": "atom", "name": "multiply", "atomId": "cvxpy.multiply"},
                ],
            },
            "workspaceNodes": [
                {"id": "node-x", "modelObjectId": "var-x", "modelObjectKind": "variable"},
                {"id": "node-product", "modelObjectId": "atom-product", "modelObjectKind": "atom"},
            ],
            "connections": [
                {
                    "id": "connection-x-left",
                    "source": {"nodeId": "node-x", "objectId": "var-x", "port": "expression"},
                    "target": {"nodeId": "node-product", "objectId": "atom-product", "slot": "arg0"},
                },
                {
                    "id": "connection-x-right",
                    "source": {"nodeId": "node-x", "objectId": "var-x", "port": "expression"},
                    "target": {"nodeId": "node-product", "objectId": "atom-product", "slot": "arg1"},
                },
            ],
        }
    )
    result = inspect_cvxpy_metadata(ir)

    assert result.metadata["atom-product"]["is_dcp"] is False
    assert any("not DCP" in diagnostic.message for diagnostic in result.diagnostics)


def test_generic_norm_atom_object_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "norm",
            "cvxpy.norm",
            [{"id": "arg_0", "name": "x", "kind": "reference", "objectId": "var-x"}],
            {"p": {"id": "kw_p", "name": "p", "kind": "literal", "value": 2}},
        )
    )

    assert result.diagnostics == []
    assert result.metadata["atom-norm"]["sign"] == "NONNEGATIVE"
    assert result.metadata["atom-norm"]["is_dcp"] is True


def test_generic_sum_squares_atom_object_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "sum_squares",
            "cvxpy.sum_squares",
            [{"id": "arg_0", "name": "expr", "kind": "reference", "objectId": "var-x"}],
        )
    )

    assert result.diagnostics == []
    assert result.metadata["atom-sum_squares"]["curvature"] == "CONVEX"
    assert result.metadata["atom-sum_squares"]["is_dcp"] is True


def test_generic_abs_atom_object_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "abs",
            "cvxpy.abs",
            [{"id": "arg_0", "name": "x", "kind": "reference", "objectId": "var-x"}],
        )
    )

    assert result.diagnostics == []
    assert result.metadata["atom-abs"]["sign"] == "NONNEGATIVE"
    assert result.metadata["atom-abs"]["is_dcp"] is True


def test_generic_atom_missing_reference_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "abs",
            "cvxpy.abs",
            [{"id": "arg_0", "name": "x", "kind": "reference", "objectId": "missing-x"}],
        )
    )

    assert any("missing-x" in diagnostic.message for diagnostic in result.diagnostics)


def test_generic_atom_invalid_keyword_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "abs",
            "cvxpy.abs",
            [{"id": "arg_0", "name": "x", "kind": "reference", "objectId": "var-x"}],
            {"bad_keyword": {"id": "kw_bad", "name": "bad_keyword", "kind": "literal", "value": 1}},
        )
    )

    assert any("Invalid CVXPY atom call" in diagnostic.message for diagnostic in result.diagnostics)


def test_generic_atom_rejects_unregistered_import_path_if_cvxpy_is_installed() -> None:
    pytest.importorskip("cvxpy")

    result = inspect_cvxpy_metadata(
        generic_atom_ir(
            "system",
            "os.system",
            [{"id": "arg_0", "name": "x", "kind": "reference", "objectId": "var-x"}],
        )
    )

    assert any("not registered" in diagnostic.message for diagnostic in result.diagnostics)
