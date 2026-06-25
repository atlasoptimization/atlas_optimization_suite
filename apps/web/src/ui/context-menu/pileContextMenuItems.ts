import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { Pile } from "../../core/types/session";
import { buildDomainFilteredDrawMenuItems } from "../draw/buildDrawMenuItems";
import type { ContextMenuItem } from "./contextMenuTypes";

type PileMenuCallbacks = {
  promptForCount: (domain: string, label: string) => number | null;
  inspectPile: (pile: Pile) => void;
  inspectDiscard: (pile: Pile) => void;
  dispatchAction: (action: DeckAction) => void;
};

export function getDrawPileContextMenuItems(
  pile: Pile,
  cards: DeckCard[],
  piles: Pile[],
  callbacks: PileMenuCallbacks
): ContextMenuItem[] {
  const domain = pile.domain ?? pile.name;

  return [
    buildDomainFilteredDrawMenuItems({ domain, cards, piles, callbacks }),
    {
      id: "pile",
      label: "Pile",
      children: [
        {
          id: "shuffle",
          label: "Shuffle",
          action: { type: "pile.shuffle", domain }
        },
        {
          id: "return-discards",
          label: "Return all discards to this pile",
          action: { type: "pile.returnAllDiscardsToPile", domain }
        },
        {
          id: "inspect-pile",
          label: "Inspect pile",
          onClick: () => callbacks.inspectPile(pile)
        }
      ]
    }
  ];
}

export function getDiscardPileContextMenuItems(
  pile: Pile,
  callbacks: PileMenuCallbacks
): ContextMenuItem[] {
  const domain = pile.domain ?? pile.name;
  const firstCardId = pile.discardCardIds[0];

  return [
    {
      id: "discard",
      label: "Discard",
      children: [
        {
          id: "inspect-discard",
          label: "Inspect discard pile",
          onClick: () => callbacks.inspectDiscard(pile)
        },
        {
          id: "play-first",
          label: "Play top / first card",
          enabled: Boolean(firstCardId),
          action: firstCardId ? { type: "pile.playFromDiscard", domain, cardId: firstCardId } : undefined
        },
        {
          id: "return-all",
          label: "Return all to draw pile",
          enabled: pile.discardCardIds.length > 0,
          action: { type: "pile.returnAllDiscardsToPile", domain }
        }
      ]
    }
  ];
}
