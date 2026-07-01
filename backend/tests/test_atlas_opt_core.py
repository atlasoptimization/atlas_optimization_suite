"""Tests for the FastAPI-independent Atlas execution core."""

from __future__ import annotations

import importlib
import inspect
import sys

import pytest

import atlas_opt_core
from atlas_opt_core.examples import tiny_lp_ir
from atlas_opt_core.registry import cvxpy_info, discover_atoms
from atlas_opt_core.codegen import generate_code
from atlas_opt_core.solver import solve_ir


def test_core_imports_without_fastapi() -> None:
    """Importing atlas_opt_core should not import FastAPI."""

    sys.modules.pop("fastapi", None)
    importlib.reload(atlas_opt_core)

    assert "fastapi" not in sys.modules
    assert atlas_opt_core.generate_code


def test_core_atom_discovery_returns_common_atoms() -> None:
    atoms = discover_atoms()
    names = {atom["name"] for atom in atoms}

    assert atoms
    assert {"norm", "sum_squares", "sum", "abs", "square"}.issubset(names)


def test_core_cvxpy_info_reports_runtime() -> None:
    info = cvxpy_info()

    assert info["coreImportsSucceeded"] is True
    assert "pythonVersion" in info
    assert isinstance(info["installedSolvers"], list)
    if info["cvxpyAvailable"]:
        assert info["cvxpyVersion"]


def test_core_tiny_lp_generate_code() -> None:
    response = generate_code(tiny_lp_ir())

    assert "import cvxpy as cp" in response["code"]
    assert "problem.solve()" in response["code"]


def test_core_tiny_lp_solves_if_cvxpy_available() -> None:
    pytest.importorskip("cvxpy")

    response = solve_ir(tiny_lp_ir())

    assert response["status"] in {"optimal", "optimal_inaccurate"}
    assert response["variableValues"]["var-x"] == pytest.approx(2, abs=1e-4)
    assert response["variableValues"]["var-y"] == pytest.approx(2, abs=1e-4)
    assert response["objectiveValue"] == pytest.approx(10, abs=1e-4)


def test_fastapi_routes_delegate_to_core_functions() -> None:
    api_main = importlib.import_module("api.main")
    source = inspect.getsource(api_main)

    assert "atlas_opt_core" in source
    assert "AtlasOptimizer.from_ir" not in source
    assert "solve_problem(" not in source


def test_cvxpy_info_route_is_registered_if_fastapi_is_installed() -> None:
    pytest.importorskip("fastapi")

    from api.main import app, cvxpy_info as route_cvxpy_info

    paths = {route.path for route in app.routes}
    body = route_cvxpy_info()

    assert "/cvxpy/info" in paths
    assert body["coreImportsSucceeded"] is True
    assert "cvxpyVersion" in body
    assert isinstance(body["installedSolvers"], list)
