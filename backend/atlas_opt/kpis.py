"""KPI calculation helpers for Atlas model reports."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .evaluator import EvaluationResult
from .expressions import Expression

if TYPE_CHECKING:
    from .desk import AtlasDesk


@dataclass
class KPI:
    """Minimal KPI object backed by an expression or function reference."""

    id: str
    name: str
    expression: Expression

    def evaluate(self, desk: "AtlasDesk") -> EvaluationResult:
        """Evaluate the KPI expression."""

        return desk.evaluate_expression(self.expression)
