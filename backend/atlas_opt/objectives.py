"""Objective-card semantic helpers."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal

from .diagnostics import Diagnostic
from .evaluator import EvaluationResult
from .functions import symbolic_expression
from .schema import ObjectiveIR, ObjectiveTermIR

if TYPE_CHECKING:
    from .desk import AtlasDesk


@dataclass
class ObjectiveTerm:
    """Semantic objective term that references a Function card."""

    id: str
    name: str
    function_card_id: str | None
    source: ObjectiveTermIR

    @classmethod
    def from_ir(cls, term_ir: ObjectiveTermIR) -> "ObjectiveTerm":
        return cls(term_ir.id, term_ir.name, term_ir.functionCardId, term_ir)

    def evaluate(
        self,
        desk: "AtlasDesk",
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate the referenced function."""

        if not self.function_card_id:
            return EvaluationResult(
                None,
                [Diagnostic("warning", f'Objective term "{self.name}" has no function reference.', self.id)],
                [],
            )
        return desk.evaluate_function(self.function_card_id, runtime_values=runtime_values)

    def symbolic(self, desk: "AtlasDesk") -> str:
        """Render the referenced function symbolically."""

        if not self.function_card_id:
            return self.name
        function = desk.functions.get(self.function_card_id)
        return function.symbolic(desk) if function else f"missing({self.function_card_id})"


@dataclass
class Objective:
    """Semantic objective composed of ordered terms."""

    source_card_id: str
    direction: Literal["minimize", "maximize"]
    terms: list[ObjectiveTerm] = field(default_factory=list)
    source: ObjectiveIR | None = None

    @classmethod
    def from_ir(cls, source_card_id: str, objective_ir: ObjectiveIR) -> "Objective":
        return cls(
            source_card_id=source_card_id,
            direction=objective_ir.direction,
            terms=[ObjectiveTerm.from_ir(term) for term in objective_ir.terms],
            source=objective_ir,
        )

    def evaluate(
        self,
        desk: "AtlasDesk",
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate all terms and sum their values."""

        diagnostics: list[Diagnostic] = []
        dependencies = []
        total = 0.0
        for term in self.terms:
            result = term.evaluate(desk, runtime_values=runtime_values)
            diagnostics.extend(result.diagnostics)
            dependencies.extend(result.dependencies)
            if result.value is None:
                diagnostics.append(
                    Diagnostic("warning", f'Objective term "{term.name}" did not evaluate.', self.source_card_id)
                )
                continue
            total += result.value
        return EvaluationResult(total, diagnostics, dependencies)

    def symbolic(self, desk: "AtlasDesk") -> str:
        """Return a readable mathematical preview."""

        prefix = "min" if self.direction == "minimize" else "max"
        body = " + ".join(term.symbolic(desk) for term in self.terms) or "0"
        return f"{prefix} {body}"
