"""Tests for build-time CVXPY symbol synchronization."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

from atlas_opt_core.symbols import (
    BACKEND_GENERATED_PATH,
    FRONTEND_GENERATED_PATH,
    SymbolCatalog,
    generate_symbol_catalog,
    load_generated_catalog,
)


def test_generated_catalog_is_non_empty_and_schema_valid() -> None:
    catalog = load_generated_catalog()
    names = {symbol.name for symbol in catalog.symbols}

    assert catalog.symbols
    assert {"norm", "sum_squares", "sum"}.issubset(names)
    assert {"hstack", "vstack"} & names


def test_overrides_and_pseudo_symbols_are_applied() -> None:
    catalog = load_generated_catalog()
    by_id = {symbol.id: symbol for symbol in catalog.symbols}

    assert by_id["cvxpy.atoms.norm.norm"].source == "auto+override"
    assert by_id["cvxpy.atoms.norm.norm"].category == "Norms"
    assert by_id["cvxpy.atoms.norm.norm"].ui
    assert by_id["cvxpy.atoms.affine.hstack.hstack"].ui
    assert by_id["atlas.operator.add"].source == "pseudo"
    assert by_id["atlas.operator.matmul"].symbol == "@"
    assert by_id["atlas.constraint.leq"].kind == "constraint_operator"


def test_missing_override_does_not_remove_discovery(tmp_path: Path) -> None:
    overrides = tmp_path / "overrides.json"
    overrides.write_text(json.dumps({"cvxpy.missing_symbol": {"category": "Missing"}}), encoding="utf-8")
    result = generate_symbol_catalog(overrides_path=overrides)

    names = {symbol["name"] for symbol in result.catalog["symbols"]}
    assert "norm" in names
    assert any("did not match" in diagnostic.message for diagnostic in result.diagnostics)


def test_invalid_override_reports_diagnostic(tmp_path: Path) -> None:
    overrides = tmp_path / "overrides.json"
    overrides.write_text(json.dumps({"cvxpy.atoms.norm.norm": {"arguments": "bad"}}), encoding="utf-8")
    result = generate_symbol_catalog(overrides_path=overrides)

    assert any("arguments must be a list" in diagnostic.message for diagnostic in result.diagnostics)


def test_sync_command_check_passes() -> None:
    env = {**os.environ, "PYTHONPATH": "backend"}
    result = subprocess.run(
        [sys.executable, "-m", "atlas_opt_core.tools.sync_cvxpy_symbols", "--check"],
        cwd=Path(__file__).resolve().parents[2],
        env=env,
        text=True,
        capture_output=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
    assert "in sync" in result.stdout


def test_generated_frontend_and_backend_catalogs_match() -> None:
    backend = json.loads(BACKEND_GENERATED_PATH.read_text(encoding="utf-8"))
    frontend = json.loads(FRONTEND_GENERATED_PATH.read_text(encoding="utf-8"))

    SymbolCatalog.model_validate(backend)
    assert backend == frontend
