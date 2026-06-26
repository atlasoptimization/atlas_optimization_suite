"""Function-card semantic helpers, including TaggedSum."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from .diagnostics import Diagnostic
from .evaluator import EvaluationResult, evaluate_expression
from .expressions import Expression, expression_from_ir
from .queries import detect_missing_properties
from .schema import FunctionConfigIR

if TYPE_CHECKING:
    from .desk import AtlasDesk


@dataclass
class TaggedSumFunction:
    """Semantic TaggedSum: query cards, evaluate expression per card, sum values."""

    source_card_id: str
    query_id: str | None
    expression: Expression | None
    name: str
    source: FunctionConfigIR

    @classmethod
    def from_config(cls, source_card_id: str, config: FunctionConfigIR) -> "TaggedSumFunction":
        """Build a TaggedSum function from raw function config IR."""

        return cls(
            source_card_id=source_card_id,
            query_id=config.queryId,
            expression=expression_from_ir(config.expression),
            name=config.displayName,
            source=config,
        )

    def evaluate(
        self,
        desk: "AtlasDesk",
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate this TaggedSum without invoking optimization."""

        if not self.query_id:
            return EvaluationResult(
                None,
                [Diagnostic("warning", f'TaggedSum "{self.name}" has no query.', self.source_card_id)],
                [],
            )
        if self.expression is None:
            return EvaluationResult(
                None,
                [Diagnostic("warning", f'TaggedSum "{self.name}" has no expression.', self.source_card_id)],
                [],
            )

        query_result = desk.evaluate_query(self.query_id)
        diagnostics = list(query_result.diagnostics)
        dependencies = []
        total = 0.0

        required_properties = [
            dependency.property_name
            for dependency in self.expression.dependencies()
            if dependency.kind == "property" and dependency.property_name
        ]
        diagnostics.extend(detect_missing_properties(query_result, required_properties))
        diagnostics.extend(detect_nonlinear_property_products(self.expression, query_result.matched_cards))

        for card in query_result.matched_cards:
            result = evaluate_expression(self.expression, desk, card, runtime_values)
            diagnostics.extend(result.diagnostics)
            dependencies.extend(result.dependencies)
            if result.value is not None:
                total += result.value

        if any(diagnostic.level == "error" for diagnostic in diagnostics):
            return EvaluationResult(None, diagnostics, dependencies)
        return EvaluationResult(total, diagnostics, dependencies)

    def dependencies(self, desk: "AtlasDesk"):
        """Return dependencies implied by the query and expression."""

        if not self.query_id or self.expression is None:
            return []
        query_result = desk.evaluate_query(self.query_id)
        return [
            dependency
            for card in query_result.matched_cards
            for dependency in self.expression.dependencies(card.id)
        ]

    def symbolic(self, desk: "AtlasDesk") -> str:
        """Return a readable symbolic preview for this TaggedSum."""

        query = desk.queries.get(self.query_id or "")
        query_text = "no query"
        if query is not None:
            parts = [
                *(f"{condition.key}={condition.value}" for condition in query.includeTags),
                *(f"not {condition.key}={condition.value}" for condition in query.excludeTags),
            ]
            query_text = ", ".join(parts) or query.name
        expression_text = symbolic_expression(self.expression) if self.expression else "expression"
        return f"Σ({expression_text} | {query_text})"


def symbolic_expression(expression: Expression | None) -> str:
    """Return a compact symbolic representation for supported expressions."""

    if expression is None:
        return "expression"
    if expression.kind == "literal":
        return str(expression.value)
    if expression.kind == "property_ref":
        return expression.property_name or "property"
    if expression.kind == "function_ref":
        return expression.function_card_id or "function"
    if expression.kind == "multiply":
        return f"{symbolic_expression(expression.left)} * {symbolic_expression(expression.right)}"
    if expression.kind == "add":
        return " + ".join(symbolic_expression(term) for term in expression.terms)
    return expression.kind


def detect_nonlinear_property_products(expression: Expression, cards) -> list[Diagnostic]:
    """Warn when property x property has no constant-valued side."""

    diagnostics: list[Diagnostic] = []
    if expression.kind == "multiply":
        left = expression_property_names(expression.left)
        right = expression_property_names(expression.right)
        if left and right:
            names = [*left, *right]
            constant_names = [
                name
                for name in names
                if all(
                    (prop := card.property_by_name(name)) is not None
                    and prop.kind == "constant"
                    and is_numeric(prop.value)
                    for card in cards
                )
            ]
            if not constant_names:
                diagnostics.append(
                    Diagnostic(
                        "warning",
                        "Property x property terms are nonlinear unless one property is constant-valued across all matched cards.",
                    )
                )
    if expression.kind == "multiply":
        diagnostics.extend(detect_nonlinear_property_products(expression.left, cards) if expression.left else [])
        diagnostics.extend(detect_nonlinear_property_products(expression.right, cards) if expression.right else [])
    if expression.kind == "add":
        for term in expression.terms:
            diagnostics.extend(detect_nonlinear_property_products(term, cards))
    return diagnostics


def expression_property_names(expression: Expression | None) -> list[str]:
    if expression is None:
        return []
    if expression.kind == "property_ref" and expression.property_name:
        return [expression.property_name]
    if expression.kind == "multiply":
        return [*expression_property_names(expression.left), *expression_property_names(expression.right)]
    if expression.kind == "add":
        return [name for term in expression.terms for name in expression_property_names(term)]
    return []


def is_numeric(value: object) -> bool:
    if isinstance(value, bool) or value is None:
        return False
    if isinstance(value, (int, float)):
        return True
    if isinstance(value, str):
        try:
            float(value)
            return True
        except ValueError:
            return False
    return False
