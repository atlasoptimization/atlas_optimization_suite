import type { DeckCard } from "../../core/types/card";
import {
  getCardArtImage,
  getCardBackPreview,
  getCardFrontPreview,
  getCardPdfPath
} from "../cards/cardAssetResolution";

export function getInspectorAssetSources(card: DeckCard) {
  return {
    artImage: getCardArtImage(card, "inspector"),
    frontImage: getCardFrontPreview(card, "inspector"),
    backImage: getCardBackPreview(card, "inspector"),
    pdfPath: getCardPdfPath(card)
  };
}
