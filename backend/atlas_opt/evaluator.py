"""Solver-independent evaluator for AtlasDesk expressions and functions."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

from .cards import AtlasCard
from .diagnostics import Diagnostic
from .expressions import Expression, ExpressionDependency

if TYPE_CHECKING:
    from .desk import AtlasDesk


@dataclass
class EvaluationResult:
    """Structured result from evaluating an expression or function."""

    value: float | None
    diagnostics: list[Diagnostic] = field(default_factory=list)
    dependencies: list[ExpressionDependency] = field(default_factory=list)


def evaluate_expression(
    expression: Expression,
    desk: "AtlasDesk",
    card: AtlasCard | None = None,
    runtime_values: dict[str, float] | None = None,
) -> EvaluationResult:
    """Evaluate a structured expression without invoking any solver backend."""

    runtime_values = runtime_values or {}

    if expression.kind == "literal":
        return numeric_value(expression.value, "literal")

    if expression.kind == "property_ref":
        if card is None:
            return EvaluationResult(
                None,
                [Diagnostic("error", "Property reference requires a card context.")],
                expression.dependencies(None),
            )
        dependency = expression.dependencies(card.id)
        property_name = expression.property_name or ""
        runtime_key = f"{card.id}.{property_name}"
        if runtime_key in runtime_values:
            return EvaluationResult(runtime_values[runtime_key], dependencies=dependency)
        prop = card.property_by_name(property_name)
        if prop is None:
            return EvaluationResult(
                None,
                [
                    Diagnostic(
                        "warning",
                        f'Card "{card.id}" is missing property "{property_name}".',
                        card.id,
                    )
                ],
                dependency,
            )
        if prop.kind == "decision_ref" and isinstance(prop.value, str):
            if prop.value in runtime_values:
                return EvaluationResult(runtime_values[prop.value], dependencies=dependency)
            dynamic_key = f"{card.id}.{property_name}"
            if dynamic_key in runtime_values:
                return EvaluationResult(runtime_values[dynamic_key], dependencies=dependency)
        if prop.kind == "data_ref":
            return evaluate_data_reference(prop.value, desk, f"{card.id}.{property_name}", dependency)
        value = numeric_value(prop.value, f'{card.id}.{property_name}')
        value.dependencies = dependency
        return value

    if expression.kind == "multiply":
        left = evaluate_required_child(expression.left, desk, card, runtime_values, "left")
        right = evaluate_required_child(expression.right, desk, card, runtime_values, "right")
        return combine_binary(left, right, "multiply")

    if expression.kind == "add":
        results = [
            evaluate_expression(term, desk, card, runtime_values) for term in expression.terms
        ]
        diagnostics = [diag for result in results for diag in result.diagnostics]
        dependencies = [dep for result in results for dep in result.dependencies]
        if any(result.value is None for result in results):
            return EvaluationResult(None, diagnostics, dependencies)
        return EvaluationResult(sum(result.value or 0 for result in results), diagnostics, dependencies)

    if expression.kind == "function_ref":
        if not expression.function_card_id:
            return EvaluationResult(
                None,
                [Diagnostic("warning", "Function reference is missing a function card id.")],
                expression.dependencies(),
            )
        result = desk.evaluate_function(expression.function_card_id, runtime_values=runtime_values)
        return EvaluationResult(
            result.value,
            result.diagnostics,
            [*expression.dependencies(), *result.dependencies],
        )

    return EvaluationResult(
        None,
        [Diagnostic("error", f'Unsupported expression kind "{expression.kind}".')],
        [],
    )


def evaluate_required_child(
    expression: Expression | None,
    desk: "AtlasDesk",
    card: AtlasCard | None,
    runtime_values: dict[str, float],
    label: str,
) -> EvaluationResult:
    """Evaluate a required child expression, returning a diagnostic if absent."""

    if expression is None:
        return EvaluationResult(None, [Diagnostic("error", f"Missing {label} expression.")], [])
    return evaluate_expression(expression, desk, card, runtime_values)


def combine_binary(left: EvaluationResult, right: EvaluationResult, operator: str) -> EvaluationResult:
    """Combine two numeric results."""

    diagnostics = [*left.diagnostics, *right.diagnostics]
    dependencies = [*left.dependencies, *right.dependencies]
    if left.value is None or right.value is None:
        return EvaluationResult(None, diagnostics, dependencies)
    if operator == "multiply":
        return EvaluationResult(left.value * right.value, diagnostics, dependencies)
    return EvaluationResult(None, [*diagnostics, Diagnostic("error", f"Unsupported operator {operator}.")], dependencies)


def numeric_value(value: object, label: str) -> EvaluationResult:
    """Coerce a value to float or return a non-crashing diagnostic."""

    if isinstance(value, bool) or value is None:
        return EvaluationResult(None, [Diagnostic("warning", f"{label} is not numeric.")], [])
    if isinstance(value, (int, float)):
        return EvaluationResult(float(value), [], [])
    if isinstance(value, str) and value.strip():
        try:
            return EvaluationResult(float(value), [], [])
        except ValueError:
            pass
    return EvaluationResult(None, [Diagnostic("warning", f"{label} is not numeric.")], [])


def evaluate_data_reference(value: object, desk: "AtlasDesk", label: str, dependency) -> EvaluationResult:
    """Resolve a tiny CSV data reference from Data-card preview metadata."""

    if not isinstance(value, dict):
        return EvaluationResult(None, [Diagnostic("warning", f"{label} data_ref is not structured.")], dependency)
    data_card_id = value.get("dataCardId")
    column = value.get("column")
    if not isinstance(data_card_id, str) or not isinstance(column, str):
        return EvaluationResult(None, [Diagnostic("warning", f"{label} data_ref requires dataCardId and column.")], dependency)
    data_card = desk.cards.get(data_card_id)
    if data_card is None or data_card.source is None or data_card.source.data is None:
        return EvaluationResult(None, [Diagnostic("warning", f'Data card "{data_card_id}" was not found.', data_card_id)], dependency)
    if column not in data_card.source.data.columns:
        return EvaluationResult(None, [Diagnostic("warning", f'Column "{column}" was not found in "{data_card_id}".', data_card_id)], dependency)
    row_index = value.get("rowIndex", 0)
    if not isinstance(row_index, int):
        row_index = 0
    try:
        row = data_card.source.data.previewRows[row_index]
    except IndexError:
        return EvaluationResult(None, [Diagnostic("warning", f"{label} rowIndex is outside preview data.")], dependency)
    result = numeric_value(row.get(column), f"{data_card_id}.{column}")
    result.dependencies = dependency
    return result
