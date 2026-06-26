"""Import tests for the Atlas Python modeling core."""

import importlib

import atlas_opt


def test_atlas_package_imports() -> None:
    assert atlas_opt.AtlasIR
    assert atlas_opt.AtlasDesk


def test_all_backend_modules_import_cleanly() -> None:
    modules = [
        "schema",
        "desk",
        "cards",
        "properties",
        "queries",
        "expressions",
        "functions",
        "objectives",
        "constraints",
        "diagnostics",
        "evaluator",
        "compiler",
        "optimizer",
        "reports",
        "kpis",
        "cvxpy_backend",
    ]

    for module in modules:
        assert importlib.import_module(f"atlas_opt.{module}")
