"""Validation and metadata inspection entry points for Atlas IR."""

from __future__ import annotations

from typing import Any

from atlas_opt.optimizer import AtlasOptimizer
from atlas_opt.schema import AtlasIR
from .diagnostics import normalize_response_diagnostics
from .migrations import migrate_ir


def validate_ir(ir: AtlasIR | dict[str, Any]) -> dict[str, Any]:
    """Validate Atlas IR and return diagnostics plus CVXPY metadata."""

    migrated, migration_diagnostics = migrate_ir(ir)
    result = AtlasOptimizer.from_ir(migrated).validate()
    result["diagnostics"] = [*migration_diagnostics, *result.get("diagnostics", [])]
    return normalize_response_diagnostics(result, "compiler")


def inspect_ir(ir: AtlasIR | dict[str, Any]) -> dict[str, Any]:
    """Inspect Atlas IR with the local CVXPY metadata engine."""

    return validate_ir(ir)
