"""Structured diagnostic helpers for Atlas core responses."""

from __future__ import annotations

from typing import Any


def structured_diagnostic(
    message: str,
    severity: str = "warning",
    source: str = "compiler",
    target_id: str | None = None,
    target_kind: str = "project",
    suggested_fix: str | None = None,
    related_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Return a structured diagnostic while keeping legacy fields."""

    normalized_severity = severity if severity in {"error", "warning", "info"} else "warning"
    return {
        "id": f"diagnostic-{abs(hash((message, target_id, source))) % 10_000_000}",
        "severity": normalized_severity,
        "level": normalized_severity,
        "source": source,
        "targetId": target_id,
        "sourceId": target_id,
        "targetKind": target_kind,
        "message": message,
        "suggestedFix": suggested_fix,
        "relatedIds": related_ids or [],
    }


def normalize_response_diagnostics(response: dict[str, Any], source: str = "compiler") -> dict[str, Any]:
    """Normalize response diagnostics in-place-compatible form."""

    diagnostics = response.get("diagnostics", [])
    if not isinstance(diagnostics, list):
        response["diagnostics"] = []
        return response
    response["diagnostics"] = [normalize_diagnostic(item, index, source) for index, item in enumerate(diagnostics)]
    return response


def normalize_diagnostic(item: Any, index: int, source: str) -> dict[str, Any]:
    """Normalize legacy strings/dicts to Atlas structured diagnostics."""

    if isinstance(item, str):
        return structured_diagnostic(item, "error" if "error" in item.lower() else "warning", source)
    if isinstance(item, dict):
        severity = item.get("severity") or item.get("level") or "warning"
        message = str(item.get("message") or f"Diagnostic {index}")
        return {
            **structured_diagnostic(
                message,
                severity,
                str(item.get("source") or source),
                item.get("targetId") or item.get("sourceId"),
                str(item.get("targetKind") or "project"),
                item.get("suggestedFix"),
                item.get("relatedIds") if isinstance(item.get("relatedIds"), list) else [],
            ),
            **item,
        }
    return structured_diagnostic(f"Diagnostic {index}", "warning", source)
