"""Optimization orchestration entry points for future solver integrations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .desk import AtlasDesk
from .cvxpy_backend import generate_cvxpy_code, solve_problem
from .diagnostics import Diagnostic
from .reports import Report
from .schema import AtlasIR


@dataclass
class AtlasOptimizer:
    """Thin orchestration facade over AtlasDesk for API use."""

    desk: AtlasDesk

    @classmethod
    def from_ir(cls, raw_ir: AtlasIR | dict[str, Any]) -> "AtlasOptimizer":
        """Build an optimizer from raw Atlas IR."""

        return cls(AtlasDesk.from_ir(raw_ir))

    def validate(self) -> dict[str, Any]:
        """Return desk diagnostics without solving."""

        return {"diagnostics": serialize_diagnostics(self.desk.diagnostics)}

    def evaluate(self) -> dict[str, Any]:
        """Evaluate semantic functions, objectives, constraints, KPIs, and report summary."""

        return {
            "functions": {
                function_id: serialize_evaluation(self.desk.evaluate_function(function_id))
                for function_id in self.desk.functions
            },
            "objectives": {
                objective_id: serialize_evaluation(self.desk.evaluate_objective(objective_id))
                for objective_id in self.desk.objectives
            },
            "constraints": {
                constraint_id: serialize_constraint_evaluation(
                    self.desk.evaluate_constraint(constraint_id)
                )
                for constraint_id in self.desk.constraints
            },
            "kpis": {
                kpi_id: serialize_evaluation(self.desk.evaluate_kpi(kpi_id))
                for kpi_id in self.desk.kpis
            },
            "report": Report(self.desk).summary(),
            "diagnostics": serialize_diagnostics(self.desk.diagnostics),
        }

    def generate_code(self) -> dict[str, Any]:
        """Generate readable CVXPY code for the supported linear subset."""

        return {
            "code": generate_cvxpy_code(self.desk),
            "diagnostics": [],
        }

    def solve(self) -> dict[str, Any]:
        """Compile and solve the supported linear subset when CVXPY is installed."""

        result = solve_problem(self.desk)
        return {
            "status": result.status,
            "objectiveValue": result.objective_value,
            "variableValues": result.variable_values,
            "constraints": result.constraint_values,
            "diagnostics": serialize_diagnostics(result.diagnostics),
            "code": result.code,
        }


def serialize_evaluation(result) -> dict[str, Any]:
    """Serialize an EvaluationResult."""

    return {
        "value": result.value,
        "diagnostics": serialize_diagnostics(result.diagnostics),
        "dependencies": [
            {
                "kind": dependency.kind,
                "cardId": dependency.card_id,
                "propertyName": dependency.property_name,
                "functionCardId": dependency.function_card_id,
            }
            for dependency in result.dependencies
        ],
    }


def serialize_constraint_evaluation(result) -> dict[str, Any]:
    """Serialize a ConstraintEvaluation."""

    return {
        "left": result.left,
        "right": result.right,
        "residual": result.residual,
        "active": result.active,
        "satisfied": result.satisfied,
        "diagnostics": serialize_diagnostics(result.diagnostics),
    }


def serialize_diagnostics(diagnostics: list[Diagnostic]) -> list[dict[str, Any]]:
    """Serialize diagnostics for API responses."""

    return [serialize_diagnostic(diagnostic) for diagnostic in diagnostics]


def serialize_diagnostic(diagnostic: Diagnostic) -> dict[str, Any]:
    """Serialize one diagnostic."""

    return {
        "level": diagnostic.level,
        "message": diagnostic.message,
        "sourceId": diagnostic.source_id,
    }
