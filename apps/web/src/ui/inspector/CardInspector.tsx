import type { DeckCard } from "../../core/types/card";
import type { CardInstance } from "../../core/types/session";
import type { CardDisplayMode } from "../../core/types/view";
import { domainClass } from "../../core/constants/domains";
import { getEffectModWithAspectFallback } from "../../core/constants/aspect";
import { TextBlock } from "../text/TextBlock";
import { getInspectorAssetSources } from "./inspectorAssets";
import { openPdfAsset } from "../../assets/openPdfAsset";

type CardInspectorProps = {
  card: DeckCard | null;
  selectedInstance: CardInstance | null;
  onDisplayModeChange: (displayMode: CardDisplayMode) => void;
  onReveal: () => void;
  onHide: () => void;
  onToggleAblated: () => void;
};

const DISPLAY_MODES: { value: CardDisplayMode; label: string }[] = [
  { value: "card-face-and-active-effect", label: "Standard: front + back + active effect" },
  { value: "text-card", label: "Text card" },
  { value: "pdf-front", label: "PDF front" },
  { value: "pdf-back", label: "PDF back" },
  { value: "pdf-both", label: "PDF front + back" },
  { value: "card-face", label: "Card face" },
  { value: "active-effect", label: "Active effect only" },
  { value: "compact-name", label: "Compact" },
  { value: "scientific-twin", label: "Scientific" },
  { value: "question", label: "Question" },
  { value: "flavor-text", label: "Flavor text" },
  { value: "full-card-image", label: "Legacy full card image" }
];

export function CardInspector({
  card,
  selectedInstance,
  onDisplayModeChange,
  onReveal,
  onHide,
  onToggleAblated
}: CardInspectorProps) {
  const isHidden = selectedInstance?.hidden === true;
  const assets = card ? getInspectorAssetSources(card) : null;

  return (
    <div>
      <h2>Inspector</h2>
      {!card && <p className="muted">Select a card.</p>}

      {card && (
        <div className={`inspector-card ${domainClass(card.domain)}`}>
          {isHidden ? <h3>Hidden card</h3> : <h3>{card.cardname}</h3>}
          <p className="domain-line">
            {card.domain}
            {!isHidden && card.subdomain ? ` · ${card.subdomain}` : ""}
          </p>

          {selectedInstance && (
            <section className="field-section">
              <h4>Study</h4>
              <p className="muted">
                Status: {selectedInstance.ablated ? "Ablated" : "Active"}
              </p>
              <button type="button" onClick={onToggleAblated}>
                {selectedInstance.ablated ? "Restore ablated/destroyed card" : "Toggle ablated/destroyed"}
              </button>
            </section>
          )}

          {isHidden && (
            <section className="field-section">
              <h4>Secret</h4>
              <p className="muted">This card is hidden until revealed.</p>
              <div className="inspector-button-row">
                <button type="button" onClick={onReveal}>
                  Reveal
                </button>
              </div>
            </section>
          )}

          {!isHidden && assets && (
            <section className="field-section inspector-assets">
              <h4>Images</h4>
              {assets.artImage && (
                <img className="inspector-image" src={assets.artImage} alt={`${card.cardname} art`} />
              )}
              {(assets.frontImage || assets.backImage) && (
                <div className="inspector-preview-pair">
                  {assets.frontImage && (
                    <img className="inspector-image" src={assets.frontImage} alt={`${card.cardname} front`} />
                  )}
                  {assets.backImage && (
                    <img className="inspector-image" src={assets.backImage} alt={`${card.cardname} back`} />
                  )}
                </div>
              )}
              {!assets.artImage && !assets.frontImage && !assets.backImage && (
                <p className="muted">No image preview available.</p>
              )}
            </section>
          )}

          {selectedInstance && !isHidden && (
            <section className="field-section">
              <h4>Display mode</h4>
              <select
                value={selectedInstance.displayMode}
                onChange={(event) =>
                  onDisplayModeChange(event.target.value as CardDisplayMode)
                }
              >
                {DISPLAY_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label}
                  </option>
                ))}
              </select>
            </section>
          )}

          {!isHidden && (
            <>
              {selectedInstance && (
                <section className="field-section">
                  <h4>Secret</h4>
                  <button type="button" onClick={onHide}>
                    Hide
                  </button>
                </section>
              )}

              <Section title="Summary" value={card.summary} />
              <Section title="Scientific twin" value={card.twin} />
              <Section title="Question" value={card.question} />
              <Section title="Virtue" value={card.effectGood} />
              <Section title="Pathology" value={card.effectBad} />
              <Section
                title="Modifier"
                value={getEffectModWithAspectFallback(card.domain, card.effectMod)}
              />
              <Section title="Story" value={card.story} />

              <section className="field-section">
                <h4>PDF</h4>
                {assets?.pdfPath ? (
                  <button
                    type="button"
                    className="pdf-link"
                    onClick={() => openPdfAsset(card.pdfPath)}
                  >
                    Open PDF
                  </button>
                ) : (
                  <p className="muted">PDF is not bundled in this build.</p>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, value }: { title: string; value?: string }) {
  if (!value) return null;

  return (
    <section className="field-section">
      <h4>{title}</h4>
      <TextBlock text={value} />
    </section>
  );
}
