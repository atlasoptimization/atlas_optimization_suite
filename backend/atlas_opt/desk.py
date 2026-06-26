"""AtlasDesk semantic model and registries."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from pydantic import ValidationError

from .cards import AtlasCard, card_from_ir
from .constraints import Constraint, ConstraintEvaluation
from .diagnostics import Diagnostic
from .evaluator import EvaluationResult, evaluate_expression
from .expressions import Expression
from .functions import TaggedSumFunction
from .kpis import KPI
from .objectives import Objective
from .queries import QueryResult, evaluate_query_object
from .schema import AtlasIR, ConstraintIR, MetadataIR, ObjectiveIR, PropertyIR, QueryIR


@dataclass
class AtlasDesk:
    """Top-level semantic workbench compiled from validated Atlas IR."""

    cards: dict[str, AtlasCard] = field(default_factory=dict)
    queries: dict[str, QueryIR] = field(default_factory=dict)
    functions: dict[str, TaggedSumFunction] = field(default_factory=dict)
    objectives: dict[str, Objective] = field(default_factory=dict)
    constraints: dict[str, Constraint] = field(default_factory=dict)
    kpis: dict[str, KPI] = field(default_factory=dict)
    diagnostics: list[Diagnostic] = field(default_factory=list)
    metadata: MetadataIR | None = None
    source_ir: AtlasIR | None = None

    @classmethod
    def from_ir(cls, raw_ir: AtlasIR | dict[str, Any]) -> "AtlasDesk":
        """Validate raw IR if needed and compile it into semantic registries."""

        try:
            ir = raw_ir if isinstance(raw_ir, AtlasIR) else AtlasIR.model_validate(raw_ir)
        except ValidationError:
            raise

        desk = cls(metadata=ir.metadata, source_ir=ir)

        for card_ir in ir.cards:
            if card_ir.id in desk.cards:
                desk.diagnostics.append(
                    Diagnostic("error", f'Duplicate card id "{card_ir.id}".', card_ir.id)
                )
                continue
            card = card_from_ir(card_ir)
            desk.cards[card.id] = card
            if card_ir.type == "function" and card_ir.taggedSum is not None:
                desk.functions[card_ir.id] = TaggedSumFunction.from_config(
                    card_ir.id,
                    card_ir.taggedSum,
                )
            if card_ir.type == "objective" and card_ir.objective is not None:
                desk.objectives[card_ir.id] = Objective.from_ir(card_ir.id, card_ir.objective)
            if card_ir.type == "constraint" and card_ir.constraint is not None:
                desk.constraints[card_ir.id] = Constraint.from_ir(card_ir.id, card_ir.constraint)

        for query in ir.queries:
            if query.id in desk.queries:
                desk.diagnostics.append(
                    Diagnostic("error", f'Duplicate query id "{query.id}".', query.id)
                )
                continue
            desk.queries[query.id] = query

        for objective_id, objective in desk.objectives.items():
            for term in objective.terms:
                if term.function_card_id and term.function_card_id not in desk.cards:
                    desk.diagnostics.append(
                        Diagnostic(
                            "warning",
                            f'Objective term "{term.name}" references missing card "{term.function_card_id}".',
                            objective_id,
                        )
                    )

        for constraint_id, constraint in desk.constraints.items():
            for expression in (constraint.source.left, constraint.source.right):
                if expression.kind == "function_ref" and expression.functionCardId not in (None, *desk.cards.keys()):
                    desk.diagnostics.append(
                        Diagnostic(
                            "warning",
                            f'Constraint references missing card "{expression.functionCardId}".',
                            constraint_id,
                        )
                    )

        return desk

    def get_card(self, card_id: str) -> AtlasCard | None:
        """Look up a card by id and record a diagnostic when missing."""

        card = self.cards.get(card_id)
        if card is None:
            self.diagnostics.append(Diagnostic("warning", f'Card "{card_id}" was not found.', card_id))
        return card

    def find_cards_by_type(self, card_type: str) -> list[AtlasCard]:
        """Return all cards with the requested Atlas card type."""

        return [card for card in self.cards.values() if card.type == card_type]

    def get_property(self, card_id: str, property_name: str) -> PropertyIR | None:
        """Look up a named property on a card and collect diagnostics when missing."""

        card = self.get_card(card_id)
        if card is None:
            return None
        prop = card.property_by_name(property_name)
        if prop is None:
            self.diagnostics.append(
                Diagnostic(
                    "warning",
                    f'Card "{card_id}" is missing property "{property_name}".',
                    card_id,
                )
            )
        return prop

    def list_properties(self, card_id: str) -> list[PropertyIR]:
        """List all properties on a card."""

        card = self.get_card(card_id)
        return [] if card is None else list(card.properties)

    def evaluate_query(self, query_id: str) -> QueryResult:
        """Evaluate a stored query by id."""

        query = self.queries.get(query_id)
        if query is None:
            diagnostic = Diagnostic("warning", f'Query "{query_id}" was not found.', query_id)
            self.diagnostics.append(diagnostic)
            return QueryResult([], [], [diagnostic])
        return self.evaluate_query_object(query)

    def evaluate_query_object(self, query: QueryIR) -> QueryResult:
        """Evaluate a query object against this desk's cards."""

        return evaluate_query_object(query, list(self.cards.values()))

    def evaluate_function(
        self,
        function_id: str,
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate a semantic function by source Function card id."""

        function = self.functions.get(function_id)
        if function is None:
            diagnostic = Diagnostic("warning", f'Function "{function_id}" was not found.', function_id)
            self.diagnostics.append(diagnostic)
            return EvaluationResult(None, [diagnostic], [])
        return function.evaluate(self, runtime_values=runtime_values)

    def evaluate_expression(
        self,
        expression: Expression,
        card: AtlasCard | None = None,
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate an expression with this desk as context."""

        return evaluate_expression(expression, self, card, runtime_values)

    def evaluate_objective(
        self,
        objective_id: str,
        runtime_values: dict[str, float] | None = None,
    ) -> EvaluationResult:
        """Evaluate a semantic objective by source Objective card id."""

        objective = self.objectives.get(objective_id)
        if objective is None:
            diagnostic = Diagnostic("warning", f'Objective "{objective_id}" was not found.', objective_id)
            self.diagnostics.append(diagnostic)
            return EvaluationResult(None, [diagnostic], [])
        return objective.evaluate(self, runtime_values=runtime_values)

    def evaluate_constraint(
        self,
        constraint_id: str,
        runtime_values: dict[str, float] | None = None,
    ) -> ConstraintEvaluation:
        """Evaluate a semantic constraint by source Constraint card id."""

        constraint = self.constraints.get(constraint_id)
        if constraint is None:
            diagnostic = Diagnostic("warning", f'Constraint "{constraint_id}" was not found.', constraint_id)
            self.diagnostics.append(diagnostic)
            return ConstraintEvaluation(None, None, None, None, None, [diagnostic])
        return constraint.evaluate(self, runtime_values=runtime_values)

    def evaluate_kpi(self, kpi_id: str) -> EvaluationResult:
        """Evaluate a registered KPI."""

        kpi = self.kpis.get(kpi_id)
        if kpi is None:
            diagnostic = Diagnostic("warning", f'KPI "{kpi_id}" was not found.', kpi_id)
            self.diagnostics.append(diagnostic)
            return EvaluationResult(None, [diagnostic], [])
        return kpi.evaluate(self)
