import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type Ref
} from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import {
  TABLEAU_DEFAULT_SCALE,
  TABLEAU_HEIGHT,
  TABLEAU_WIDTH,
  computeCardBounds,
  computeResetViewTransform,
  computeViewTransformForBounds
} from "../../core/constants/tableau";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { RecentActionEffects } from "../../core/types/effects";
import type { ModeRecommendation } from "../../core/types/mode";
import type { ArrowObject, CardInstance, NoteObject, Pile } from "../../core/types/session";
import type { ViewSettings } from "../../core/types/view";
import type { MobileUiConfig } from "../../config/mobileUi";
import type { DiscoveredCustomDomain } from "../../customDomains/discoveredCustomDomains";
import { ContextMenu } from "../context-menu/ContextMenu";
import { getCardContextMenuItems } from "../context-menu/cardContextMenuItems";
import type { ContextMenuPosition } from "../context-menu/contextMenuTypes";
import { DomainPileBar } from "../piles/DomainPileBar";
import { NoteObjectView } from "../notes/NoteObjectView";
import { EffectLayer } from "../effects/EffectLayer";
import { CardInstanceView } from "./CardInstanceView";
import { DomainZoneOverlay } from "./DomainZoneOverlay";
import { Minimap } from "./Minimap";
import { TableauNavigationControls } from "./TableauNavigationControls";
import { ArrowLayer } from "../drawing/ArrowLayer";
import { NextActionPanel } from "../modes/NextActionPanel";
import type { TopologyBackgroundMap } from "./topologyBackgrounds";

type TableauProps = {
  tableau: CardInstance[];
  notes: NoteObject[];
  arrows: ArrowObject[];
  piles: Pile[];
  cards: DeckCard[];
  customDomains: DiscoveredCustomDomain[];
  cardsById: Map<string, DeckCard>;
  selectedInstanceId: string | null;
  selectedNoteId: string | null;
  selectedArrowId: string | null;
  onSelectInstance: (instanceId: string) => void;
  onSelectNote: (noteId: string) => void;
  onSelectArrow: (arrowId: string) => void;
  onMoveCard: (instanceId: string, dx: number, dy: number) => void;
  onMoveNote: (noteId: string, dx: number, dy: number) => void;
  onMoveArrowEndpoint: (arrowId: string, endpoint: "start" | "end", dx: number, dy: number) => void;
  onMoveArrow: (arrowId: string, dx: number, dy: number) => void;
  onUpdateNoteText: (noteId: string, text: string) => void;
  onDispatchAction: (action: DeckAction) => void;
  onDrawFromPile: (domain: string) => void;
  onPlayFromDiscard: (domain: string, cardId: string) => void;
  onReturnDiscardToPile: (domain: string, cardId: string) => void;
  requestedPileInspectDomain: string | null;
  onPileInspectRequestHandled: () => void;
  guidedPileSession: {
    modeId: string;
    domain: string;
    stepId: string;
    cardsDrawn: string[];
  } | null;
  onCompleteGuidedPileSession: (forceComplete?: boolean) => void;
  highlightedDomains: string[];
  cardCount: number | null;
  viewSettings: ViewSettings;
  topologyBackgrounds?: TopologyBackgroundMap;
  effects: RecentActionEffects;
  exportRef?: Ref<HTMLElement>;
  activeModeName: string;
  nextRecommendation: ModeRecommendation | null;
  nextActionDisabled?: boolean;
  nextActionDisabledReason?: string;
  onNext: () => void;
  onOpenModePanel: () => void;
  onOpenHelp: () => void;
  onClearSession: () => void;
  onPileOverlayScaleChange: (scale: number) => void;
  onNextPanelPositionChange: (position: { x: number; y: number } | null) => void;
  uiConfig?: MobileUiConfig;
};

type ReadingZoomState = {
  active: true;
  cardInstanceId: string;
  previousView: {
    scale: number;
    positionX: number;
    positionY: number;
  };
};

export function Tableau({
  tableau,
  notes,
  arrows,
  piles,
  cards,
  customDomains,
  cardsById,
  selectedInstanceId,
  selectedNoteId,
  selectedArrowId,
  onSelectInstance,
  onSelectNote,
  onSelectArrow,
  onMoveCard,
  onMoveNote,
  onMoveArrowEndpoint,
  onMoveArrow,
  onUpdateNoteText,
  onDispatchAction,
  onDrawFromPile,
  onPlayFromDiscard,
  onReturnDiscardToPile,
  requestedPileInspectDomain,
  onPileInspectRequestHandled,
  guidedPileSession,
  onCompleteGuidedPileSession,
  highlightedDomains,
  cardCount,
  viewSettings,
  topologyBackgrounds,
  effects,
  exportRef,
  activeModeName,
  nextRecommendation,
  nextActionDisabled = false,
  nextActionDisabledReason,
  onNext,
  onOpenModePanel,
  onOpenHelp,
  onClearSession,
  onPileOverlayScaleChange,
  onNextPanelPositionChange,
  uiConfig
}: TableauProps) {
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    items: ReturnType<typeof getCardContextMenuItems>;
  } | null>(null);
  const [readingZoom, setReadingZoom] = useState<ReadingZoomState | null>(null);
  const [mobilePilesOpen, setMobilePilesOpen] = useState(false);
  const overlayLayerRef = useRef<HTMLDivElement | null>(null);
  const nextPanelRef = useRef<HTMLDivElement | null>(null);
  const nextPanelDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [isNextPanelDragging, setIsNextPanelDragging] = useState(false);

  const openCardContextMenu = useCallback(
    (instance: CardInstance, card: DeckCard, position: ContextMenuPosition) => {
      setContextMenu({
        position,
        items: getCardContextMenuItems(instance, card.domain, card.pdfPath)
      });
    },
    []
  );

  const openNoteContextMenu = useCallback((note: NoteObject, position: ContextMenuPosition) => {
    setContextMenu({
      position,
      items: [
        {
          id: "delete-note",
          label: "Delete note",
          action: {
            type: "note.delete",
            noteId: note.id
          }
        }
      ]
    });
  }, []);

  const openArrowContextMenu = useCallback((arrow: ArrowObject, position: ContextMenuPosition) => {
    setContextMenu({
      position,
      items: [
        {
          id: "delete-arrow",
          label: "Delete arrow",
          action: {
            type: "arrow.delete",
            arrowId: arrow.id
          }
        }
      ]
    });
  }, []);

  const clampNextPanelPosition = useCallback((x: number, y: number) => {
    const overlay = overlayLayerRef.current;
    const panel = nextPanelRef.current;
    const overlayWidth = overlay?.clientWidth ?? window.innerWidth;
    const overlayHeight = overlay?.clientHeight ?? window.innerHeight;
    const panelWidth = panel?.offsetWidth ?? 360;
    const panelHeight = panel?.offsetHeight ?? 220;
    const margin = 8;

    return {
      x: Math.round(Math.min(Math.max(margin, x), Math.max(margin, overlayWidth - panelWidth - margin))),
      y: Math.round(Math.min(Math.max(margin, y), Math.max(margin, overlayHeight - panelHeight - margin)))
    };
  }, []);

  const beginNextPanelDrag = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const overlay = overlayLayerRef.current;
      const panel = nextPanelRef.current;
      if (!overlay || !panel) return;

      event.preventDefault();
      event.stopPropagation();

      const overlayRect = overlay.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      nextPanelDragRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - panelRect.left,
        offsetY: event.clientY - panelRect.top
      };
      setIsNextPanelDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);

      onNextPanelPositionChange(
        clampNextPanelPosition(panelRect.left - overlayRect.left, panelRect.top - overlayRect.top)
      );
    },
    [clampNextPanelPosition, onNextPanelPositionChange]
  );

  const moveNextPanel = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const drag = nextPanelDragRef.current;
      const overlay = overlayLayerRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !overlay) return;
      if ((event.buttons & 1) !== 1) {
        nextPanelDragRef.current = null;
        setIsNextPanelDragging(false);
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      const overlayRect = overlay.getBoundingClientRect();
      onNextPanelPositionChange(
        clampNextPanelPosition(
          event.clientX - overlayRect.left - drag.offsetX,
          event.clientY - overlayRect.top - drag.offsetY
        )
      );
    },
    [clampNextPanelPosition, onNextPanelPositionChange]
  );

  const endNextPanelDrag = useCallback((event: PointerEvent<HTMLElement>) => {
    const drag = nextPanelDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    nextPanelDragRef.current = null;
    setIsNextPanelDragging(false);
  }, []);

  const nextPanelPosition = viewSettings.nextPanelPosition;
  const isMobileUi = uiConfig?.showMobileActionBar ?? false;
  const customNextPanelStyle = nextPanelPosition
    ? ({
        left: nextPanelPosition.x,
        top: nextPanelPosition.y
      } as CSSProperties)
    : undefined;
  const nextPanel = (
    <div className="desk-overlay-next-panel" data-testid="desk-overlay-next-panel" ref={nextPanelRef}>
      <NextActionPanel
        modeName={activeModeName}
        recommendation={nextRecommendation}
        disabled={nextActionDisabled}
        disabledReason={nextActionDisabledReason}
        isDragging={isNextPanelDragging}
        onDragStart={beginNextPanelDrag}
        onDragMove={moveNextPanel}
        onDragEnd={endNextPanelDrag}
        onNext={onNext}
        onResetPosition={() => onNextPanelPositionChange(null)}
      />
    </div>
  );

  return (
    <section
      ref={exportRef}
      className={`tableau-panel ${
        viewSettings.showGrid ? "" : "grid-hidden"
      } ${viewSettings.enableVisualEffects ? "visual-effects-enabled" : ""}`}
      data-testid="tableau"
    >
      <div className="desk-viewport" data-testid="desk-viewport">
        {viewSettings.enableVisualEffects && <EffectLayer effects={effects} />}
        <TransformWrapper
          minScale={0.12}
          maxScale={16}
          initialScale={TABLEAU_DEFAULT_SCALE}
          centerOnInit
          centerZoomedOut={false}
          limitToBounds
          panning={{
            excluded: [
              "tableau-card",
              "note-object",
              "arrow-object-hit-line",
              "arrow-endpoint",
              "context-menu",
              "desk-overlay",
              "domain-pile-bar",
              "next-action-panel",
              "tableau-navigation-controls",
              "tableau-minimap"
            ]
          }}
          doubleClick={{ disabled: true, excluded: ["tableau-card", "note-object", "desk-overlay"] }}
        >
          {(transformControls) => (
            <>
              <ReadingZoomEscape
                controls={transformControls}
                readingZoom={readingZoom}
                onClear={() => setReadingZoom(null)}
              />
              <TransformComponent
                wrapperClass="transform-wrapper"
                contentClass="transform-content"
                contentStyle={{
                  width: TABLEAU_WIDTH,
                  height: TABLEAU_HEIGHT
                }}
              >
                <div
                  className="tableau-canvas tableau-world"
                  data-testid="tableau-world"
                  style={{
                    width: TABLEAU_WIDTH,
                    height: TABLEAU_HEIGHT
                  }}
                  onPointerDownCapture={(event) => {
                    if (!readingZoom) return;
                    const target = event.target;
                    if (!(target instanceof Element)) return;
                    const zoomedCard = target.closest("[data-card-instance-id]");
                    if (zoomedCard?.getAttribute("data-card-instance-id") === readingZoom.cardInstanceId) {
                      return;
                    }
                    restoreReadingZoom(transformControls, readingZoom);
                    setReadingZoom(null);
                  }}
                >
                {viewSettings.showDomainZones && viewSettings.zoneVisibility !== "hidden" && (
                  <DomainZoneOverlay
                    visibility={viewSettings.zoneVisibility}
                    imageSource={viewSettings.topologyImageSource}
                    backgrounds={topologyBackgrounds}
                  />
                )}

                {tableau.map((placed) => {
                  const card = cardsById.get(placed.cardId) ?? createMissingCard(placed.cardId);

                  return (
                    <CardInstanceView
                      key={placed.instanceId}
                      card={card}
                      placed={placed}
                      selected={selectedInstanceId === placed.instanceId}
                      emphasized={
                        viewSettings.enableVisualEffects &&
                        selectedInstanceId === placed.instanceId
                      }
                      newlyDrawn={
                        viewSettings.enableVisualEffects &&
                        effects.highlightedInstanceId === placed.instanceId
                      }
                      hasModifierAttachment={
                        viewSettings.enableVisualEffects &&
                        placed.orientation === "modifier" &&
                        notes.some((note) => note.attachedTo === placed.instanceId)
                      }
                      onSelect={() => onSelectInstance(placed.instanceId)}
                      onMove={(dx, dy) => onMoveCard(placed.instanceId, dx, dy)}
                      onCycleOrientation={() =>
                        onDispatchAction({
                          type: "card.cycleOrientation",
                          instanceId: placed.instanceId
                        })
                      }
                      onOpenContextMenu={(position) => openCardContextMenu(placed, card, position)}
                      onReadingZoom={() => {
                        if (readingZoom) return;
                        const wrapper = transformControls.instance.wrapperComponent;
                        if (!wrapper) return;
                        const { scale, positionX, positionY } =
                          transformControls.instance.transformState;
                        const transform = computeViewTransformForBounds(
                          wrapper.clientWidth,
                          wrapper.clientHeight,
                          computeCardBounds(placed),
                          {
                            padding: 10,
                            fill: 0.88,
                            minScale: 2.1,
                            maxScale: 6
                          }
                        );
                        setReadingZoom({
                          active: true,
                          cardInstanceId: placed.instanceId,
                          previousView: { scale, positionX, positionY }
                        });
                        transformControls.setTransform(
                          transform.positionX,
                          transform.positionY,
                          transform.scale,
                          180,
                          "easeOut"
                        );
                      }}
                      zoomScale={transformControls.instance.transformState.scale}
                    />
                  );
                })}

                <ArrowLayer
                  arrows={arrows}
                  selectedArrowId={selectedArrowId}
                  width={TABLEAU_WIDTH}
                  height={TABLEAU_HEIGHT}
                  zoomScale={transformControls.instance.transformState.scale}
                  onSelectArrow={onSelectArrow}
                  onMoveArrow={onMoveArrow}
                  onMoveEndpoint={onMoveArrowEndpoint}
                  onOpenContextMenu={openArrowContextMenu}
                />

                {notes.map((note) => (
                  <NoteObjectView
                    key={note.id}
                    note={note}
                    selected={selectedNoteId === note.id}
                    zoomScale={transformControls.instance.transformState.scale}
                    onSelect={() => onSelectNote(note.id)}
                    onMove={(dx, dy) => onMoveNote(note.id, dx, dy)}
                    onTextChange={(text) => onUpdateNoteText(note.id, text)}
                    onOpenContextMenu={(position) => openNoteContextMenu(note, position)}
                  />
                ))}
                </div>
              </TransformComponent>

              <div className="desk-overlay-layer" data-testid="desk-overlay-layer" ref={overlayLayerRef}>
                <div className="desk-overlay desk-overlay-top-left">
                  {!isMobileUi && (
                    <div className="canvas-toolbar">
                    <span>{cardCount === null ? "Loading..." : `${cardCount} cards loaded`}</span>
                    <span>{tableau.length} cards on tableau</span>
                    </div>
                  )}
                  {viewSettings.showPileBar && !uiConfig?.collapsePiles && (
                    <DomainPileBar
                      piles={piles}
                      cards={cards}
                      customDomains={customDomains}
                      highlightedDomains={highlightedDomains}
                      onDrawFromPile={onDrawFromPile}
                      onPlayFromDiscard={onPlayFromDiscard}
                      onReturnDiscardToPile={onReturnDiscardToPile}
                      onDispatchAction={onDispatchAction}
                      showScientificNames={viewSettings.showScientificNames}
                      requestedInspectDomain={requestedPileInspectDomain}
                      onInspectRequestHandled={onPileInspectRequestHandled}
                      guidedPileSession={guidedPileSession}
                      onCompleteGuidedPileSession={onCompleteGuidedPileSession}
                      overlayScale={viewSettings.pileOverlayScale}
                      onOverlayScaleChange={onPileOverlayScaleChange}
                    />
                  )}
                </div>

                {nextPanelPosition && (
                  <div
                    className="desk-overlay desk-overlay-next-panel-custom"
                    data-testid="desk-overlay-next-panel-custom"
                    style={customNextPanelStyle}
                  >
                    {nextPanel}
                  </div>
                )}

                <div className="desk-overlay desk-overlay-top-right">
                  {!nextPanelPosition && nextPanel}
                  {!uiConfig?.showOnlyResetView && (
                    <TableauNavigationControls
                      controls={transformControls}
                      tableau={tableau}
                      notes={notes}
                      arrows={arrows}
                      onNavigate={() => setReadingZoom(null)}
                      uiConfig={uiConfig}
                    />
                  )}
                </div>

                {viewSettings.showMinimap && !uiConfig?.hideMinimap && (
                  <div className="desk-overlay desk-overlay-bottom-right">
                    <Minimap cards={tableau} controls={transformControls} />
                  </div>
                )}

                {uiConfig?.showMobileActionBar && (
                  <div className="desk-overlay desk-overlay-mobile-action-bar">
                    <MobileActionBar
                      config={uiConfig}
                      onMode={onOpenModePanel}
                      onReset={() => {
                        setReadingZoom(null);
                        const wrapper = transformControls.instance.wrapperComponent;
                        if (!wrapper) return;
                        const transform = computeResetViewTransform(
                          wrapper.clientWidth,
                          wrapper.clientHeight
                        );
                        transformControls.setTransform(
                          transform.positionX,
                          transform.positionY,
                          transform.scale,
                          180,
                          "easeOut"
                        );
                      }}
                      onNext={onNext}
                      nextDisabled={nextActionDisabled}
                      onClear={onClearSession}
                      onHelp={onOpenHelp}
                    />
                  </div>
                )}

                {uiConfig?.showMobilePileDrawer && (
                  <div
                    className={`desk-overlay mobile-pile-drawer ${
                      mobilePilesOpen ? "open" : "collapsed"
                    }`}
                    data-testid="mobile-pile-drawer"
                  >
                    {mobilePilesOpen ? (
                      <div className="mobile-pile-drawer-panel">
                        <button
                          type="button"
                          className="mobile-pile-drawer-toggle"
                          data-testid="mobile-pile-drawer-collapse"
                          onClick={() => setMobilePilesOpen(false)}
                        >
                          Collapse
                        </button>
                        <DomainPileBar
                          piles={piles}
                          cards={cards}
                          customDomains={customDomains}
                          highlightedDomains={highlightedDomains}
                          onDrawFromPile={onDrawFromPile}
                          onPlayFromDiscard={onPlayFromDiscard}
                          onReturnDiscardToPile={onReturnDiscardToPile}
                          onDispatchAction={onDispatchAction}
                          showScientificNames={viewSettings.showScientificNames}
                          requestedInspectDomain={requestedPileInspectDomain}
                          onInspectRequestHandled={onPileInspectRequestHandled}
                          guidedPileSession={guidedPileSession}
                          onCompleteGuidedPileSession={onCompleteGuidedPileSession}
                          overlayScale={0.72}
                          onOverlayScaleChange={onPileOverlayScaleChange}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="mobile-pile-drawer-handle"
                        data-testid="mobile-pile-drawer-expand"
                        onClick={() => setMobilePilesOpen(true)}
                      >
                        Piles
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </TransformWrapper>
      </div>

      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          position={contextMenu.position}
          onAction={(item) => {
            item.onClick?.();
            const actions = Array.isArray(item.action) ? item.action : item.action ? [item.action] : [];
            for (const action of actions) {
              onDispatchAction(action);
            }
          }}
          onClose={() => setContextMenu(null)}
        />
      )}
    </section>
  );
}

function MobileActionBar({
  config,
  onMode,
  onReset,
  onNext,
  nextDisabled,
  onClear,
  onHelp
}: {
  config: MobileUiConfig;
  onMode: () => void;
  onReset: () => void;
  onNext: () => void;
  nextDisabled: boolean;
  onClear: () => void;
  onHelp: () => void;
}) {
  return (
    <nav className="mobile-action-bar" aria-label="Mobile desk actions" data-testid="mobile-action-bar">
      {config.showModeButton && (
        <button type="button" onClick={onMode}>
          Mode
        </button>
      )}
      <button type="button" onClick={onReset}>
        Reset
      </button>
      <button type="button" className="mobile-action-primary" onClick={onNext} disabled={nextDisabled}>
        Next
      </button>
      {config.showClearButton && (
        <button type="button" onClick={onClear}>
          Clear
        </button>
      )}
      {config.showHelpButton && (
        <button type="button" onClick={onHelp}>
          Help
        </button>
      )}
    </nav>
  );
}

function restoreReadingZoom(
  controls: ReactZoomPanPinchContentRef,
  readingZoom: ReadingZoomState
) {
  controls.setTransform(
    readingZoom.previousView.positionX,
    readingZoom.previousView.positionY,
    readingZoom.previousView.scale,
    180,
    "easeOut"
  );
}

function ReadingZoomEscape({
  controls,
  readingZoom,
  onClear
}: {
  controls: ReactZoomPanPinchContentRef;
  readingZoom: ReadingZoomState | null;
  onClear: () => void;
}) {
  useEffect(() => {
    if (!readingZoom) return;
    const activeReadingZoom = readingZoom;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      restoreReadingZoom(controls, activeReadingZoom);
      onClear();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controls, onClear, readingZoom]);

  return null;
}

function createMissingCard(cardId: string): DeckCard {
  return {
    id: cardId,
    cardname: "Missing card",
    domain: "Missing",
    subdomain: "",
    summary: "This card definition is no longer available.",
    twin: "",
    keywords: [],
    question: "",
    story: "",
    effectGood: "",
    effectBad: "",
    effectMod: "",
    imagePath: null,
    pdfPath: null,
    raw: {}
  };
}
