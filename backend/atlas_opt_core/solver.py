"""CVXPY solve entry points for Atlas IR."""

from __future__ import annotations

from typing import Any

from atlas_opt.optimizer import AtlasOptimizer
from atlas_opt.schema import AtlasIR
from .migrations import migrate_ir


def solve_ir(ir: AtlasIR | dict[str, Any]) -> dict[str, Any]:
    """Compile and solve Atlas IR with local CVXPY."""

    migrated, migration_diagnostics = migrate_ir(ir)
    result = AtlasOptimizer.from_ir(migrated).solve()
    result["diagnostics"] = [*migration_diagnostics, *result.get("diagnostics", [])]
    return result


def evaluate_ir(ir: AtlasIR | dict[str, Any]) -> dict[str, Any]:
    """Evaluate Atlas IR without solving."""

    migrated, migration_diagnostics = migrate_ir(ir)
    result = AtlasOptimizer.from_ir(migrated).evaluate()
    result["diagnostics"] = [*migration_diagnostics, *result.get("diagnostics", [])]
    return result
