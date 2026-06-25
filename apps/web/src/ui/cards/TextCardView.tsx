import type { CSSProperties } from "react";
import type { DeckCard } from "../../core/types/card";
import type { Orientation } from "../../core/types/session";
import { getCardArtImage } from "./cardAssetResolution";
import { getActiveEffect } from "./cardText";
import { TextBlock } from "../text/TextBlock";

export type TextCardContent = {
  title: string;
  twin: string;
  domainLine: string;
  keywords: string;
  body: string;
  effect: string;
  effectLabel: string;
  backgroundImage: string | null;
};

function effectLabel(orientation: Orientation) {
  if (orientation === "reversed") return "Pathology";
  if (orientation === "modifier") return "Modifier";
  if (orientation === "question") return "Question";
  return "Virtue";
}

export function getTextCardContent(card: DeckCard, orientation: Orientation): TextCardContent {
  const domainLine = `${card.domain || "Custom"}${card.subdomain ? ` / ${card.subdomain}` : ""}`;
  const keywords = card.keywords.length > 0 ? card.keywords.join(" · ") : domainLine;
  const title = card.cardname || "Untitled card";
  const body = card.summary || card.story || card.question || title;

  return {
    title,
    twin: card.twin || "Custom thought card",
    domainLine,
    keywords,
    body,
    effect: getActiveEffect(card, orientation) || card.question || body,
    effectLabel: effectLabel(orientation),
    backgroundImage: getCardArtImage(card, "inspector")
  };
}

export function TextCardView({
  card,
  orientation
}: {
  card: DeckCard;
  orientation: Orientation;
}) {
  const content = getTextCardContent(card, orientation);

  return (
    <article
      className="structured-text-card"
      style={
        content.backgroundImage
          ? ({ "--text-card-background": `url("${content.backgroundImage}")` } as CSSProperties)
          : undefined
      }
    >
      {content.backgroundImage && <div className="structured-text-card-image" aria-hidden="true" />}
      <header>
        <strong>{content.title}</strong>
        <span>{content.twin}</span>
      </header>

      <div className="structured-text-card-meta">
        <span>{content.domainLine}</span>
        <small>{content.keywords}</small>
      </div>

      <section className="structured-text-card-body">
        <TextBlock text={content.body} />
      </section>

      <footer>
        <span>{content.effectLabel}</span>
        <TextBlock text={content.effect} />
      </footer>
    </article>
  );
}
