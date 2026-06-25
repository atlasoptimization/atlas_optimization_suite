import { DOMAIN_ORDER } from "../../core/constants/domains";
import { DRAWING_ZONE_BOUNDS } from "../../core/constants/tableau";
import type { DomainName } from "../../core/types/domain";
import type { CardInstance, Pile } from "../../core/types/session";

export type PlacementAnchor = {
  domain: DomainName;
  x: number;
  y: number;
};

export const STAGING_LANE_BOUNDS = DRAWING_ZONE_BOUNDS;

const STAGING_CARD_X = STAGING_LANE_BOUNDS.x + 205;

// These are tableau coordinate anchors, not screen coordinates. They place newly
// drawn cards in the left staging lane while keeping vertical domain alignment.
const DOMAIN_DRAW_ANCHORS: Record<DomainName, PlacementAnchor> = {
  Aspect: { domain: "Aspect", x: STAGING_CARD_X, y: STAGING_LANE_BOUNDS.y + 75 },
  Volition: { domain: "Volition", x: STAGING_CARD_X, y: STAGING_LANE_BOUNDS.y + 320 },
  Void: { domain: "Void", x: STAGING_CARD_X, y: STAGING_LANE_BOUNDS.y + 645 },
  Chameleon: { domain: "Chameleon", x: STAGING_CARD_X - 35, y: STAGING_LANE_BOUNDS.y + 910 },
  Structure: { domain: "Structure", x: STAGING_CARD_X + 160, y: STAGING_LANE_BOUNDS.y + 910 },
  Source: { domain: "Source", x: STAGING_CARD_X, y: STAGING_LANE_BOUNDS.y + 1300 }
};

export function getDomainDrawAnchor(domain: string): PlacementAnchor | null {
  if (!DOMAIN_ORDER.includes(domain as DomainName)) return null;
  return DOMAIN_DRAW_ANCHORS[domain as DomainName];
}

export function getNextDrawPositionForDomain({
  domain,
  tableau,
  piles
}: {
  domain: string;
  tableau: CardInstance[];
  piles: Pile[];
}): { x: number; y: number } | null {
  const anchor = getDomainDrawAnchor(domain);
  if (!anchor) return null;

  const domainPile = piles.find((pile) => pile.domain === domain);
  const domainCardIds = new Set(domainPile?.cardIds ?? []);
  const placedDomainCount = tableau.filter((card) => domainCardIds.has(card.cardId)).length;

  return {
    x: anchor.x + (placedDomainCount % 3) * 46,
    y: anchor.y + Math.floor(placedDomainCount / 3) * 54
  };
}
