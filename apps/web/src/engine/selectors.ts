import type { DeckCard } from "../core/types/card";
import type { ArrowObject, CardInstance, NoteObject, SessionState } from "../core/types/session";

export function getCardsById(cards: DeckCard[]) {
  return new Map(cards.map((card) => [card.id, card]));
}

export function getCardsForDomain(cards: DeckCard[], selectedDomain: string) {
  if (selectedDomain === "All") return cards;
  return cards.filter((card) => card.domain === selectedDomain);
}

export function getSelectedInstance(session: SessionState): CardInstance | null {
  if (!session.selectedInstanceId) return null;
  return (
    session.tableau.find((instance) => instance.instanceId === session.selectedInstanceId) ??
    null
  );
}

export function getSelectedCard(
  session: SessionState,
  cardsById: Map<string, DeckCard>
): DeckCard | null {
  const selectedInstance = getSelectedInstance(session);
  if (!selectedInstance) return null;
  return cardsById.get(selectedInstance.cardId) ?? null;
}

export function getSelectedNote(session: SessionState): NoteObject | null {
  if (!session.selectedNoteId) return null;
  return session.notes.find((note) => note.id === session.selectedNoteId) ?? null;
}

export function getSelectedArrow(session: SessionState): ArrowObject | null {
  if (!session.selectedArrowId) return null;
  return session.arrows.find((arrow) => arrow.id === session.selectedArrowId) ?? null;
}

export function getDomainMasterCard(domain: string, cards: DeckCard[]): DeckCard | null {
  const domainKey = normalizeName(domain);
  const preferredNames = new Set([
    domainKey,
    normalizeName(`The ${domain}`),
    normalizeName(`The_${domain}`)
  ]);

  return (
    cards.find(
      (card) =>
        card.domain === domain &&
        preferredNames.has(normalizeName(card.cardname))
    ) ??
    cards.find(
      (card) => card.domain === domain && normalizeName(card.cardname).includes(domainKey)
    ) ??
    null
  );
}

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}
