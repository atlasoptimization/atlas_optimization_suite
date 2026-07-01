"""Lightweight JSON result aliases for core entry points."""

from __future__ import annotations

from typing import Any, TypeAlias

DiagnosticsResult: TypeAlias = dict[str, Any]
CodeResult: TypeAlias = dict[str, Any]
SolutionResult: TypeAlias = dict[str, Any]
