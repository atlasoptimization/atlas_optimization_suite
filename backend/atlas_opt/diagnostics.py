"""Diagnostic primitives used while compiling and evaluating Atlas models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


DiagnosticLevel = Literal["info", "warning", "error"]


@dataclass(frozen=True)
class Diagnostic:
    """A non-throwing model diagnostic tied to an optional source id."""

    level: DiagnosticLevel
    message: str
    source_id: str | None = None
