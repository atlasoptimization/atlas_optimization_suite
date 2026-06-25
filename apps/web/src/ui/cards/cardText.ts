import type { DeckCard } from "../../core/types/card";
import type { Orientation } from "../../core/types/session";
import { getEffectModWithAspectFallback } from "../../core/constants/aspect";

export function getActiveEffect(card: DeckCard, orientation: Orientation) {
  if (card.domain === "Aspect") return getEffectModWithAspectFallback(card.domain, card.effectMod);
  if (orientation === "reversed") return card.effectBad || card.cardname;
  if (orientation === "modifier") {
    return getEffectModWithAspectFallback(card.domain, card.effectMod) || card.cardname;
  }
  if (orientation === "question") {
    return card.question || card.summary || card.cardname;
  }
  return card.effectGood || card.cardname;
}
