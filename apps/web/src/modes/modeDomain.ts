import { DOMAIN_ORDER } from "../core/constants/domains";
import type { DomainVectorValue, GameMode } from "../core/types/mode";
import type { DrawCycle, SessionState } from "../core/types/session";

export function getNextModeDomain(
  mode: Pick<GameMode, "domainVector">,
  drawCycle: DrawCycle,
  allowedStatuses: DomainVectorValue[] = ["C", "R"]
) {
  if (drawCycle.order.length === 0) return "";

  for (let offset = 0; offset < drawCycle.order.length; offset += 1) {
    const domain = drawCycle.order[(drawCycle.index + offset) % drawCycle.order.length];
    const status = mode.domainVector[domain];
    if (allowedStatuses.includes(status)) return domain;
  }

  return "";
}

export function domainVector(entries: Partial<Record<(typeof DOMAIN_ORDER)[number], DomainVectorValue>>) {
  return Object.fromEntries(
    DOMAIN_ORDER.map((domain) => [domain, entries[domain] ?? "A"])
  ) as Record<string, DomainVectorValue>;
}

export function hasPlacedDomainCard(state: SessionState, domain: string) {
  const pile = state.piles.find((candidate) => candidate.domain === domain);
  if (!pile) return false;
  const cardIds = new Set(pile.cardIds);
  return state.tableau.some((instance) => cardIds.has(instance.cardId));
}

export function hasPlacedDomainCards(state: SessionState, domains: string[]) {
  return domains.every((domain) => hasPlacedDomainCard(state, domain));
}
