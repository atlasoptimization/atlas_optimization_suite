"""Semantic card objects compiled from raw Atlas IR cards."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from .schema import CardIR, PropertyIR, TagIR


CardType = Literal["object", "decision", "data", "function", "constraint", "objective"]


@dataclass
class AtlasCard:
    """Semantic card with source id preserved for frontend result mapping."""

    id: str
    type: CardType
    title: str
    tags: list[TagIR]
    properties: list[PropertyIR]
    notes: str = ""
    source: CardIR | None = None

    def property_by_name(self, name: str) -> PropertyIR | None:
        """Return a property by display name."""

        return next((prop for prop in self.properties if prop.name == name), None)


@dataclass
class ObjectCard(AtlasCard):
    """Semantic object card."""


@dataclass
class DecisionCard(AtlasCard):
    """Semantic decision card."""


@dataclass
class DataCard(AtlasCard):
    """Semantic data-source card."""


@dataclass
class FunctionCard(AtlasCard):
    """Semantic function card."""


@dataclass
class ConstraintCard(AtlasCard):
    """Semantic constraint card."""


@dataclass
class ObjectiveCard(AtlasCard):
    """Semantic objective card."""


CARD_CLASS_BY_TYPE: dict[str, type[AtlasCard]] = {
    "object": ObjectCard,
    "decision": DecisionCard,
    "data": DataCard,
    "function": FunctionCard,
    "constraint": ConstraintCard,
    "objective": ObjectiveCard,
}


def card_from_ir(card_ir: CardIR) -> AtlasCard:
    """Compile a raw card IR model into the appropriate semantic card class."""

    cls = CARD_CLASS_BY_TYPE.get(card_ir.type, AtlasCard)
    return cls(
        id=card_ir.id,
        type=card_ir.type,
        title=card_ir.title,
        tags=list(card_ir.tags),
        properties=list(card_ir.properties),
        notes=card_ir.notes,
        source=card_ir,
    )
