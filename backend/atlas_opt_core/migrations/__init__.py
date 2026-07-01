"""Atlas IR migration helpers for the Python execution core."""

from __future__ import annotations

from copy import deepcopy
from typing import Any


CURRENT_SCHEMA_VERSION = "0.3.0"


def get_current_schema_version() -> str:
    """Return the current Atlas IR schema version."""

    return CURRENT_SCHEMA_VERSION


def migrate_ir(ir: Any) -> tuple[Any, list[dict[str, str]]]:
    """Migrate a raw Atlas IR mapping to the current schema version."""

    if not isinstance(ir, dict):
        return ir, []
    diagnostics: list[dict[str, str]] = []
    current = deepcopy(ir)
    version = str(current.get("schemaVersion") or "0.1")
    if version == CURRENT_SCHEMA_VERSION:
        return current, diagnostics
    if version == "0.1":
        current = migrate_0_1_to_0_2(current)
        diagnostics.append({"level": "info", "message": "Migrated Atlas IR from 0.1 to 0.2-cvxpy.", "sourceId": "schemaVersion"})
    version = str(current.get("schemaVersion") or version)
    if version in {"0.2-cvxpy", "0.2", "0.2.0"}:
        current = migrate_0_2_to_0_3(current)
        diagnostics.append({"level": "info", "message": f"Migrated Atlas IR from {version} to {CURRENT_SCHEMA_VERSION}.", "sourceId": "schemaVersion"})
    elif version != CURRENT_SCHEMA_VERSION:
        diagnostics.append({"level": "error", "message": f'Unsupported Atlas IR schemaVersion "{version}".', "sourceId": "schemaVersion"})
    return current, diagnostics


def migrate_0_1_to_0_2(ir: dict[str, Any]) -> dict[str, Any]:
    """Migrate legacy card-only IR into the CVXPY-first envelope."""

    migrated = deepcopy(ir)
    migrated["schemaVersion"] = "0.2-cvxpy"
    metadata = dict(migrated.get("metadata") or {})
    metadata["schemaVersion"] = "0.2-cvxpy"
    migrated["metadata"] = metadata
    migrated.setdefault("modelObjects", empty_model_objects())
    migrated.setdefault("workspaceNodes", [])
    migrated.setdefault("connections", [])
    return migrated


def migrate_0_2_to_0_3(ir: dict[str, Any]) -> dict[str, Any]:
    """Add the 0.3 workspace envelope while preserving compatibility fields."""

    migrated = deepcopy(ir)
    migrated["schemaVersion"] = CURRENT_SCHEMA_VERSION
    metadata = dict(migrated.get("metadata") or {})
    metadata["schemaVersion"] = CURRENT_SCHEMA_VERSION
    migrated["metadata"] = metadata
    migrated["workspace"] = {
        **dict(migrated.get("workspace") or {}),
        "nodes": migrated.get("workspaceNodes") or [],
        "connections": migrated.get("connections") or [],
        "camera": (migrated.get("views") or {}).get("camera", {}) if isinstance(migrated.get("views"), dict) else {},
        "openPanels": (migrated.get("views") or {}).get("openPanels", {}) if isinstance(migrated.get("views"), dict) else {},
    }
    return migrated


def empty_model_objects() -> dict[str, list[Any]]:
    """Return empty modelObjects collections."""

    return {
        "variables": [],
        "parameters": [],
        "constants": [],
        "atoms": [],
        "expressions": [],
        "constraints": [],
        "objectives": [],
        "problems": [],
        "solvers": [],
        "results": [],
        "workspaceReferences": [],
    }
