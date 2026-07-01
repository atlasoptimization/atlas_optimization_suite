"""CVXPY code generation entry points for Atlas IR."""

from __future__ import annotations

from typing import Any

from atlas_opt.optimizer import AtlasOptimizer
from atlas_opt.schema import AtlasIR
from .migrations import migrate_ir


def generate_code(ir: AtlasIR | dict[str, Any]) -> dict[str, Any]:
    """Generate readable Python/CVXPY code from Atlas IR."""

    migrated, migration_diagnostics = migrate_ir(ir)
    result = AtlasOptimizer.from_ir(migrated).generate_code()
    result["diagnostics"] = [*migration_diagnostics, *result.get("diagnostics", [])]
    return result
