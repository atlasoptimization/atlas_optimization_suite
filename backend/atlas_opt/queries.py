"""Query evaluation helpers for typed-tag card selection."""

from __future__ import annotations

from dataclasses import dataclass, field

from .cards import AtlasCard
from .diagnostics import Diagnostic
from .schema import QueryIR, TagConditionIR


@dataclass
class QueryResult:
    """Structured result from evaluating a typed-tag query."""

    matched_card_ids: list[str]
    matched_cards: list[AtlasCard]
    diagnostics: list[Diagnostic] = field(default_factory=list)


def evaluate_query_object(query: QueryIR, cards: list[AtlasCard]) -> QueryResult:
    """Evaluate a query with AND include semantics and exclude filtering.

    Empty queries intentionally match all cards. This mirrors a broad selector and keeps the
    behavior deterministic; semantic validation can warn later if a broad query is suspicious.
    """

    matched_cards = [
        card
        for card in cards
        if all(card_has_tag(card, condition) for condition in query.includeTags)
        and not any(card_has_tag(card, condition) for condition in query.excludeTags)
    ]
    return QueryResult(
        matched_card_ids=[card.id for card in matched_cards],
        matched_cards=matched_cards,
    )


def collect_available_property_names(result: QueryResult) -> list[str]:
    """Return sorted unique property names across matched query cards."""

    return sorted({prop.name for card in result.matched_cards for prop in card.properties})


def detect_missing_properties(result: QueryResult, required_properties: list[str]) -> list[Diagnostic]:
    """Return diagnostics for matched cards missing required property names."""

    diagnostics: list[Diagnostic] = []
    for card in result.matched_cards:
        names = {prop.name for prop in card.properties}
        for property_name in required_properties:
            if property_name not in names:
                diagnostics.append(
                    Diagnostic(
                        "warning",
                        f'Card "{card.id}" is missing required property "{property_name}".',
                        card.id,
                    )
                )
    return diagnostics


def card_has_tag(card: AtlasCard, condition: TagConditionIR) -> bool:
    """Return whether a card has a matching typed tag condition."""

    return any(tag.key == condition.key and tag.value == condition.value for tag in card.tags)
