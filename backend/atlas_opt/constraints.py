"""Constraint-card semantic helpers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal

from .diagnostics import Diagnostic
from .evaluator import EvaluationResult
from .expressions import Expression
from .schema import ConstraintExpressionIR, ConstraintIR

if TYPE_CHECKING:
    from .desk import AtlasDesk


ConstraintRelation = Literal["<=", ">=", "=", "=="]


@dataclass
class ConstraintEvaluation:
    """Evaluation result for a full constraint."""

    left: float | None
    right: float | None
    residual: float | None
    active: bool | None
    satisfied: bool | None
    diagnostics: list[Diagnostic]


@dataclass
class Constraint:
    """Semantic constraint with left/right evaluable expressions."""

    source_card_id: str
    name: str
    left: Expression
    relation: ConstraintRelation
    right: Expression
    source: ConstraintIR

    @classmethod
    def from_ir(cls, source_card_id: str, constraint_ir: ConstraintIR) -> "Constraint":
        return cls(
            source_card_id=source_card_id,
            name=constraint_ir.name,
            left=constraint_expression_to_expression(constraint_ir.left),
            relation=constraint_ir.operator,
            right=constraint_expression_to_expression(constraint_ir.right),
            source=constraint_ir,
        )

    def evaluate(
        self,
        desk: "AtlasDesk",
        runtime_values: dict[str, float] | None = None,
    ) -> ConstraintEvaluation:
        """Evaluate both sides plus residual/activity."""

        left_result = desk.evaluate_expression(self.left, runtime_values=runtime_values)
        right_result = desk.evaluate_expression(self.right, runtime_values=runtime_values)
        diagnostics = [*left_result.diagnostics, *right_result.diagnostics]
        if left_result.value is None or right_result.value is None:
            return ConstraintEvaluation(
                left_result.value,
                right_result.value,
                None,
                None,
                None,
                diagnostics,
            )
        residual = left_result.value - right_result.value
        if self.relation == "<=":
            satisfied = residual <= 0
        elif self.relation == ">=":
            satisfied = residual >= 0
        else:
            satisfied = residual == 0
        return ConstraintEvaluation(
            left_result.value,
            right_result.value,
            residual,
            abs(residual) <= 1e-9,
            satisfied,
            diagnostics,
        )

    def symbolic(self, desk: "AtlasDesk") -> str:
        """Return a readable mathematical preview."""

        return f"{symbolic_constraint_expression(self.left, desk)} {self.relation} {symbolic_constraint_expression(self.right, desk)}"


def constraint_expression_to_expression(expression_ir: ConstraintExpressionIR) -> Expression:
    """Convert raw constraint expression IR into the generic expression AST."""

    if expression_ir.kind == "function_ref":
        return Expression("function_ref", function_card_id=expression_ir.functionCardId)
    return Expression("literal", value=expression_ir.value if expression_ir.value is not None else 0)


def symbolic_constraint_expression(expression: Expression, desk: "AtlasDesk") -> str:
    """Render a generic expression inside a constraint."""

    if expression.kind == "function_ref" and expression.function_card_id:
        function = desk.functions.get(expression.function_card_id)
        return function.symbolic(desk) if function else f"missing({expression.function_card_id})"
    if expression.kind == "literal":
        return str(expression.value)
    return expression.kind
