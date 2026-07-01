"""Golden Atlas IR regression tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from atlas_opt.schema import AtlasIR
from atlas_opt_core.codegen import generate_code
from atlas_opt_core.inspector import validate_ir
from atlas_opt_core.migrations import get_current_schema_version, migrate_ir
from atlas_opt_core.solver import solve_ir


REPO_ROOT = Path(__file__).resolve().parents[2]
GOLDEN_ROOT = REPO_ROOT / "examples" / "golden"


@pytest.mark.parametrize("name", ["tiny_lp", "least_squares", "ridge_regression"])
def test_golden_example_loads_migrates_validates_and_generates_code(name: str) -> None:
    ir = read_json(GOLDEN_ROOT / f"{name}.atlas.json")
    expected = read_json(GOLDEN_ROOT / "expected" / f"{name}.expected.json")
    migrated, migration_diagnostics = migrate_ir(ir)

    assert migrated["schemaVersion"] == get_current_schema_version()
    assert not [d for d in migration_diagnostics if d["level"] == "error"]
    AtlasIR.model_validate(migrated)
    validation = validate_ir(migrated)
    assert "diagnostics" in validation
    code = generate_code(migrated)
    assert "code" in code
    for fragment in expected["expectedGeneratedCodeFragments"]:
        assert fragment in code["code"]


def test_golden_tiny_lp_solves_to_expected_values() -> None:
    pytest.importorskip("cvxpy")
    ir = read_json(GOLDEN_ROOT / "tiny_lp.atlas.json")
    expected = read_json(GOLDEN_ROOT / "expected" / "tiny_lp.expected.json")

    result = solve_ir(ir)

    assert result["status"] in expected["expectedSolverStatus"]
    assert result["objectiveValue"] == pytest.approx(expected["expectedObjectiveValue"], abs=1e-4)
    for variable_id, variable_expected in expected["expectedVariableValues"].items():
        assert result["variableValues"][variable_id] == pytest.approx(
            variable_expected["value"],
            abs=variable_expected["tolerance"],
        )


def test_backend_codegen_returns_structured_diagnostics() -> None:
    result = generate_code(read_json(GOLDEN_ROOT / "tiny_lp.atlas.json"))

    assert "code" in result
    assert all("severity" in diagnostic for diagnostic in result["diagnostics"])
    assert all("targetKind" in diagnostic for diagnostic in result["diagnostics"])


@pytest.mark.parametrize("name", ["least_squares", "ridge_regression"])
def test_golden_advanced_examples_mark_solve_support_explicitly(name: str) -> None:
    expected = read_json(GOLDEN_ROOT / "expected" / f"{name}.expected.json")

    if expected["solveSupport"] == "pending":
        pytest.skip(expected["pendingReason"])

    result = solve_ir(read_json(GOLDEN_ROOT / f"{name}.atlas.json"))
    assert result["status"] in expected["expectedSolverStatus"]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))
