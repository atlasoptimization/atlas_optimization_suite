"""Expression tree helpers used by functions, objectives, and constraints."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from .schema import ExpressionIR


ExpressionKind = Literal["literal", "property_ref", "add", "multiply", "function_ref"]


@dataclass(frozen=True)
class ExpressionDependency:
    """A card/property or function dependency discovered in an expression."""

    kind: Literal["property", "function"]
    card_id: str | None = None
    property_name: str | None = None
    function_card_id: str | None = None


@dataclass(frozen=True)
class Expression:
    """Structured expression AST used by the Python evaluator."""

    kind: ExpressionKind
    value: float | int | str | None = None
    property_name: str | None = None
    function_card_id: str | None = None
    left: "Expression | None" = None
    right: "Expression | None" = None
    terms: tuple["Expression", ...] = field(default_factory=tuple)
    source: ExpressionIR | None = None

    @classmethod
    def from_ir(cls, expression_ir: ExpressionIR) -> "Expression":
        """Build an expression AST from validated raw IR."""

        return cls(
            kind=expression_ir.kind,
            value=expression_ir.value,
            property_name=expression_ir.propertyName,
            function_card_id=expression_ir.functionCardId,
            left=cls.from_ir(expression_ir.left) if expression_ir.left else None,
            right=cls.from_ir(expression_ir.right) if expression_ir.right else None,
            terms=tuple(cls.from_ir(term) for term in expression_ir.terms),
            source=expression_ir,
        )

    def dependencies(self, card_id: str | None = None) -> list[ExpressionDependency]:
        """Return property/function dependencies referenced by this expression."""

        if self.kind == "property_ref":
            return [
                ExpressionDependency(
                    "property",
                    card_id=card_id,
                    property_name=self.property_name,
                )
            ]
        if self.kind == "function_ref":
            return [ExpressionDependency("function", function_card_id=self.function_card_id)]
        if self.kind == "multiply":
            return [
                *(self.left.dependencies(card_id) if self.left else []),
                *(self.right.dependencies(card_id) if self.right else []),
            ]
        if self.kind == "add":
            return [dep for term in self.terms for dep in term.dependencies(card_id)]
        return []


def expression_from_ir(expression_ir: ExpressionIR | None) -> Expression | None:
    """Return an expression AST or None when the source is missing."""

    return Expression.from_ir(expression_ir) if expression_ir is not None else None
