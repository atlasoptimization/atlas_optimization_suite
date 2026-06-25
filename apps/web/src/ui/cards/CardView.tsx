import { useEffect, useState } from "react";
import type { DeckCard } from "../../core/types/card";
import type { CardDisplayMode, CardFace } from "../../core/types/view";
import type { Orientation } from "../../core/types/session";
import {
  getCardBackPreviewCandidates,
  getCardBackThumbnail,
  getCardBackPreview,
  getCardFrontPreviewCandidates,
  getCardFrontThumbnail,
  getCardFrontPreview,
  getCardPdfPath
} from "./cardAssetResolution";
import { TextBlock } from "../text/TextBlock";
import { TextCardView } from "./TextCardView";
import { getActiveEffect } from "./cardText";
import { openPdfAsset } from "../../assets/openPdfAsset";

type CardViewProps = {
  card: DeckCard;
  displayMode: CardDisplayMode;
  orientation: Orientation;
  face: CardFace;
  previewVariant?: "reading" | "thumb";
};

function getActiveEffectFallback(card: DeckCard, orientation: Orientation) {
  return getActiveEffect(card, orientation) || card.question || card.summary || card.cardname;
}

function domainLine(card: DeckCard) {
  return `${card.domain}${card.subdomain ? ` · ${card.subdomain}` : ""}`;
}

function renderPreviewPanel(
  card: DeckCard,
  panelFace: Exclude<CardFace, "both">,
  previewVariant: "reading" | "thumb"
) {
  const imageCandidates =
    panelFace === "front"
      ? previewVariant === "thumb"
        ? [getCardFrontThumbnail(card)].filter((path): path is string => Boolean(path))
        : getCardFrontPreviewCandidates(card, "desk")
      : previewVariant === "thumb"
        ? [getCardBackThumbnail(card)].filter((path): path is string => Boolean(path))
        : getCardBackPreviewCandidates(card, "desk");
  const pdfPath = getCardPdfPath(card);

  if (imageCandidates.length > 0) {
    return (
      <PreviewImage
        sources={imageCandidates}
        alt={`${card.cardname} ${panelFace}`}
      />
    );
  }

  if (panelFace === "back") {
    return (
      <div className="text-card pdf-fallback">
        <strong>No back preview available</strong>
        {pdfPath ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openPdfAsset(card.pdfPath);
            }}
          >
            Open PDF
          </button>
        ) : (
          <span>No PDF available</span>
        )}
      </div>
    );
  }

  if (pdfPath) {
    return (
      <div className="text-card pdf-fallback">
        <strong>{card.cardname}</strong>
        <span>PDF available</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            openPdfAsset(card.pdfPath);
          }}
        >
          Open PDF
        </button>
      </div>
    );
  }

  return (
    <div className="text-card">
      <strong>{card.cardname}</strong>
      <span>{domainLine(card)}</span>
    </div>
  );
}

function PreviewImage({ sources, alt }: { sources: string[]; alt: string }) {
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources.join("|")]);

  const source = sources[sourceIndex];
  if (!source) return null;

  return (
    <img
      src={source}
      alt={alt}
      draggable={false}
      onError={() => {
        setSourceIndex((currentIndex) =>
          currentIndex < sources.length - 1 ? currentIndex + 1 : currentIndex
        );
      }}
    />
  );
}

function displayModeFace(displayMode: CardDisplayMode, face: CardFace): CardFace {
  if (displayMode === "pdf-front") return "front";
  if (displayMode === "pdf-back") return "back";
  if (displayMode === "pdf-both") return "both";
  if (displayMode === "full-card-image") return "front";
  return face;
}

function isPreviewDisplayMode(displayMode: CardDisplayMode) {
  return (
    displayMode === "full-card-image" ||
    displayMode === "pdf-front" ||
    displayMode === "pdf-back" ||
    displayMode === "pdf-both" ||
    displayMode === "card-face"
  );
}

function hasPreviewAsset(card: DeckCard) {
  return Boolean(getCardFrontPreview(card, "desk") || getCardBackPreview(card, "desk") || getCardPdfPath(card));
}

export function CardView({
  card,
  displayMode,
  orientation,
  face,
  previewVariant = "reading"
}: CardViewProps) {
  if (displayMode === "text-card" || (!hasPreviewAsset(card) && isPreviewDisplayMode(displayMode))) {
    return <TextCardView card={card} orientation={orientation} />;
  }

  if (displayMode === "card-face-and-active-effect") {
    const effectFace = displayModeFace("card-face", face);

    return (
      <div className="card-with-effect">
        {effectFace === "both" ? (
          <div className="card-face-pair">
            <div className="card-face-panel">{renderPreviewPanel(card, "front", previewVariant)}</div>
            <div className="card-face-panel">{renderPreviewPanel(card, "back", previewVariant)}</div>
          </div>
        ) : (
          <div className="card-face-frame">{renderPreviewPanel(card, effectFace, previewVariant)}</div>
        )}
        <div className="active-effect-caption">
          <TextBlock text={getActiveEffectFallback(card, orientation)} />
        </div>
      </div>
    );
  }

  if (isPreviewDisplayMode(displayMode)) {
    const activeFace = displayModeFace(displayMode, face);

    if (activeFace === "both") {
      return (
        <div className="card-face-pair">
          <div className="card-face-panel">{renderPreviewPanel(card, "front", previewVariant)}</div>
          <div className="card-face-panel">{renderPreviewPanel(card, "back", previewVariant)}</div>
        </div>
      );
    }

    return renderPreviewPanel(card, activeFace, previewVariant);
  }

  if (displayMode === "compact-name") {
    return (
      <div className="text-card">
        <strong>{card.cardname}</strong>
        <span>{domainLine(card)}</span>
      </div>
    );
  }

  if (displayMode === "scientific-twin") {
    return (
      <div className="text-card">
        <strong>{card.cardname}</strong>
        <span>{card.twin || card.domain}</span>
      </div>
    );
  }

  if (displayMode === "active-effect") {
    return (
      <div className="text-card">
        <TextBlock text={getActiveEffect(card, orientation)} />
        <span>{card.domain}</span>
      </div>
    );
  }

  if (displayMode === "question") {
    return (
      <div className="text-card">
        <strong>{card.question || card.cardname}</strong>
        <span>{card.domain}</span>
      </div>
    );
  }

  if (displayMode === "flavor-text") {
    return (
      <div className="text-card">
        <strong>{card.story || card.summary || card.cardname}</strong>
        <span>{card.domain}</span>
      </div>
    );
  }

  return (
    <div className="text-card">
      <strong>{card.cardname}</strong>
      <span>{card.domain}</span>
    </div>
  );
}
