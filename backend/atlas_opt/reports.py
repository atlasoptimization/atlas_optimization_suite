"""Report generation helpers for evaluated and solved Atlas models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .desk import AtlasDesk


@dataclass
class Report:
    """Simple structured report summary for an AtlasDesk."""

    desk: "AtlasDesk"

    def summary(self) -> dict[str, Any]:
        """Collect objective, constraint, KPI, and diagnostic summaries."""

        return {
            "objectives": {
                objective_id: {
                    "value": self.desk.evaluate_objective(objective_id).value,
                    "symbolic": objective.symbolic(self.desk),
                }
                for objective_id, objective in self.desk.objectives.items()
            },
            "constraints": {
                constraint_id: {
                    "left": evaluation.left,
                    "right": evaluation.right,
                    "residual": evaluation.residual,
                    "active": evaluation.active,
                    "satisfied": evaluation.satisfied,
                    "symbolic": constraint.symbolic(self.desk),
                }
                for constraint_id, constraint in self.desk.constraints.items()
                for evaluation in [constraint.evaluate(self.desk)]
            },
            "kpis": {
                kpi_id: {"value": self.desk.evaluate_kpi(kpi_id).value}
                for kpi_id in self.desk.kpis
            },
            "diagnostics": [
                {"level": diagnostic.level, "message": diagnostic.message, "sourceId": diagnostic.source_id}
                for diagnostic in self.desk.diagnostics
            ],
        }
