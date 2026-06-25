import { useEffect, useState, type CSSProperties } from "react";
import { DOMAIN_ORDER } from "../../core/constants/domains";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { Pile } from "../../core/types/session";
import type { DiscoveredCustomDomain } from "../../customDomains/discoveredCustomDomains";
import { getDomainMasterCard } from "../../engine/selectors";
import { getCardFrontThumbnail } from "../cards/cardAssetResolution";
import { ContextMenu } from "../context-menu/ContextMenu";
import {
  getDiscardPileContextMenuItems,
  getDrawPileContextMenuItems
} from "../context-menu/pileContextMenuItems";
import type { ContextMenuPosition, ContextMenuItem } from "../context-menu/contextMenuTypes";
import { DiscardPileView } from "./DiscardPileView";
import { PileInspector } from "./PileInspector";

type DomainPileBarProps = {
  piles: Pile[];
  cards: DeckCard[];
  customDomains: DiscoveredCustomDomain[];
  highlightedDomains: string[];
  onDrawFromPile: (domain: string) => void;
  onPlayFromDiscard: (domain: string, cardId: string) => void;
  onReturnDiscardToPile: (domain: string, cardId: string) => void;
  onDispatchAction: (action: DeckAction) => void;
  showScientificNames: boolean;
  requestedInspectDomain: string | null;
  onInspectRequestHandled: () => void;
  guidedPileSession: {
    modeId: string;
    domain: string;
    stepId: string;
    cardsDrawn: string[];
  } | null;
  onCompleteGuidedPileSession: (forceComplete?: boolean) => void;
  overlayScale: number;
  onOverlayScaleChange: (scale: number) => void;
};

export function DomainPileBar({
  piles,
  cards,
  customDomains,
  highlightedDomains,
  onDrawFromPile,
  onPlayFromDiscard,
  onReturnDiscardToPile,
  onDispatchAction,
  showScientificNames,
  requestedInspectDomain,
  onInspectRequestHandled,
  guidedPileSession,
  onCompleteGuidedPileSession,
  overlayScale,
  onOverlayScaleChange
}: DomainPileBarProps) {
  const [openPileDomain, setOpenPileDomain] = useState<string | null>(null);
  const [openDiscardDomain, setOpenDiscardDomain] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    items: ContextMenuItem[];
  } | null>(null);
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const highlightedDomainSet = new Set(highlightedDomains);
  const pileDomains = [
    ...DOMAIN_ORDER,
    ...piles
      .map((pile) => pile.domain)
      .filter((domain): domain is string => Boolean(domain))
      .filter((domain) => !DOMAIN_ORDER.includes(domain as (typeof DOMAIN_ORDER)[number]))
  ];
  const openPile = piles.find((pile) => pile.domain === openPileDomain) ?? null;
  const openDiscardPile = piles.find((pile) => pile.domain === openDiscardDomain) ?? null;
  const guidedOpenPile =
    openPile && guidedPileSession?.domain === (openPile.domain ?? openPile.name)
      ? guidedPileSession
      : null;

  useEffect(() => {
    if (!requestedInspectDomain) return;
    const pile = piles.find((candidate) => candidate.domain === requestedInspectDomain);
    if (pile) setOpenPileDomain(pile.domain ?? pile.name);
    onInspectRequestHandled();
  }, [onInspectRequestHandled, piles, requestedInspectDomain]);

  function promptForCount(domain: string, label: string) {
    const raw = window.prompt(`${label} (${domain})`, "3");
    if (raw === null) return null;
    const count = Number.parseInt(raw, 10);
    return Number.isFinite(count) && count > 0 ? count : null;
  }

  function inspectPile(pile: Pile) {
    setOpenPileDomain(pile.domain ?? pile.name);
  }

  function inspectDiscard(pile: Pile) {
    setOpenDiscardDomain(pile.domain ?? pile.name);
  }

  function openContextMenu(position: ContextMenuPosition, items: ContextMenuItem[]) {
    setContextMenu({ position, items });
  }

  const pileBarStyle = {
    "--pile-overlay-scale": overlayScale
  } as CSSProperties;

  return (
    <>
      <div className="domain-pile-bar" data-testid="pile-overlay" style={pileBarStyle}>
        <div className="pile-overlay-header">
          <div className="overlay-scale-controls" aria-label="Pile overlay size">
            <button
              type="button"
              data-testid="pile-scale-decrease"
              onClick={() => onOverlayScaleChange(overlayScale - 0.1)}
            >
              -
            </button>
            <strong>{Math.round(overlayScale * 100)}%</strong>
            <button
              type="button"
              data-testid="pile-scale-increase"
              onClick={() => onOverlayScaleChange(overlayScale + 0.1)}
            >
              +
            </button>
          </div>
          <span>Piles</span>
        </div>
        <div className="domain-pile-scroll">
          {pileDomains.map((domain) => {
          const pile = piles.find((candidate) => candidate.domain === domain);
          const count = pile?.currentOrder.length ?? 0;
          const discardCount = pile?.discardCardIds.length ?? 0;
          const masterCard = getDomainMasterCard(domain, cards);
          const masterCardImage = masterCard ? getCardFrontThumbnail(masterCard) : null;
          const customDomain = customDomains.find((candidate) => candidate.name === domain);

          return (
            <div className="domain-pile-stack" key={domain}>
              <button
                className={`domain-pile-card ${highlightedDomainSet.has(domain) ? "next" : ""}`}
                data-testid={`domain-pile-${domain}`}
                onClick={() => onDrawFromPile(domain)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!pile) return;
                  openContextMenu(
                    { x: event.clientX, y: event.clientY },
                    getDrawPileContextMenuItems(pile, cards, piles, {
                      promptForCount,
                      inspectPile,
                      inspectDiscard,
                      dispatchAction: onDispatchAction
                    })
                  );
                }}
                disabled={count === 0}
              >
                {masterCardImage ? (
                  <img src={masterCardImage} alt={domain} draggable={false} />
                ) : (
                  <span className="domain-pile-fallback">
                    {customDomain ? customDomain.name.slice(0, 2) : domain}
                  </span>
                )}
                <span className="domain-pile-name">{domain}</span>
                <strong className="domain-pile-count">{count}</strong>
              </button>
              <button
                type="button"
                className="discard-pile-button"
                data-testid={`discard-pile-${domain}`}
                onClick={() =>
                  setOpenDiscardDomain((current) => (current === domain ? null : domain))
                }
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (!pile) return;
                  openContextMenu(
                    { x: event.clientX, y: event.clientY },
                    getDiscardPileContextMenuItems(pile, {
                      promptForCount,
                      inspectPile,
                      inspectDiscard,
                      dispatchAction: onDispatchAction
                    })
                  );
                }}
              >
                Discard {discardCount}
              </button>
            </div>
          );
          })}
        </div>
      </div>

      {openPile && (
        <PileInspector
          pile={openPile}
          cardsById={cardsById}
          showScientificNames={showScientificNames}
          onDrawCard={(domain, cardId, hidden) =>
            onDispatchAction({ type: "pile.drawSpecificCard", domain, cardId, hidden })
          }
          guidedSession={guidedOpenPile}
          onDone={() => {
            onCompleteGuidedPileSession(true);
            setOpenPileDomain(null);
          }}
          onClose={() => {
            if (guidedOpenPile) onCompleteGuidedPileSession(false);
            setOpenPileDomain(null);
          }}
        />
      )}

      {openDiscardPile && (
        <DiscardPileView
          pile={openDiscardPile}
          cardsById={cardsById}
          onPlayCard={onPlayFromDiscard}
          onReturnCard={onReturnDiscardToPile}
          onClose={() => setOpenDiscardDomain(null)}
        />
      )}

      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onAction={(item) => {
            item.onClick?.();
            const actions = Array.isArray(item.action) ? item.action : item.action ? [item.action] : [];
            actions.forEach(onDispatchAction);
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
}
