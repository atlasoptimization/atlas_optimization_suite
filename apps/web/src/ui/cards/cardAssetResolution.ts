import type { DeckCard } from "../../core/types/card";
import { resolvePublicAssetUrl } from "../../assets/publicAssetUrl";

export type CardAssetPurpose = "desk" | "thumbnail" | "reading" | "inspector" | "choice";

export function getCardFrontPreviewCandidates(card: DeckCard, purpose: CardAssetPurpose = "desk"): string[] {
  const paths =
    purpose === "thumbnail"
      ? [card.frontThumbImage, card.frontImage, card.frontReadingImage]
      : [card.frontReadingImage, card.frontImage, card.frontThumbImage];

  return uniqueResolvedAssetUrls(paths);
}

export function getCardBackPreviewCandidates(card: DeckCard, purpose: CardAssetPurpose = "desk"): string[] {
  const paths =
    purpose === "thumbnail"
      ? [card.backThumbImage, card.backImage, card.backReadingImage]
      : [card.backReadingImage, card.backImage, card.backThumbImage];

  return uniqueResolvedAssetUrls(paths);
}

export function getCardFrontPreview(card: DeckCard, purpose: CardAssetPurpose = "desk"): string | null {
  return getCardFrontPreviewCandidates(card, purpose)[0] ?? null;
}

export function getCardBackPreview(card: DeckCard, purpose: CardAssetPurpose = "desk"): string | null {
  return getCardBackPreviewCandidates(card, purpose)[0] ?? null;
}

export function getCardArtImage(card: DeckCard, purpose: CardAssetPurpose = "inspector"): string | null {
  if (purpose === "inspector") {
    return resolvePublicAssetUrl(card.imagePath ?? card.frontReadingImage ?? card.frontImage ?? card.frontThumbImage);
  }

  return resolvePublicAssetUrl(card.imagePath);
}

export function getCardPdfUrl(card: Pick<DeckCard, "pdfPath">): string | null {
  return resolvePublicAssetUrl(card.pdfPath);
}

export function getCardFrontImage(card: DeckCard): string | null {
  return getCardFrontPreview(card, "desk");
}

export function getCardBackImage(card: DeckCard): string | null {
  return getCardBackPreview(card, "desk");
}

export function getCardFrontThumbnail(card: DeckCard): string | null {
  return getCardFrontPreview(card, "thumbnail") ?? getCardArtImage(card);
}

export function getCardBackThumbnail(card: DeckCard): string | null {
  return getCardBackPreview(card, "thumbnail");
}

export function getCardPdfPath(card: DeckCard): string | null {
  return getCardPdfUrl(card);
}

function uniqueResolvedAssetUrls(paths: Array<string | null | undefined>): string[] {
  const resolved = paths
    .map((assetPath) => resolvePublicAssetUrl(assetPath))
    .filter((assetPath): assetPath is string => Boolean(assetPath));

  return [...new Set(resolved)];
}
