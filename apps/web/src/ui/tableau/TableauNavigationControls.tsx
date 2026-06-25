import { useEffect, useRef } from "react";
import type { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import type { ArrowObject, CardInstance, NoteObject } from "../../core/types/session";
import {
  STANDARD_VIEW_BOOKMARKS,
  TABLEAU_FIT_PADDING,
  TABLEAU_DEFAULT_VIEW_BOUNDS,
  computeObjectBounds,
  computeResetViewTransform,
  computeViewTransformForBounds,
  type TableauBounds
} from "../../core/constants/tableau";
import type { MobileUiConfig } from "../../config/mobileUi";

type TableauNavigationControlsProps = {
  controls: ReactZoomPanPinchContentRef;
  tableau: CardInstance[];
  notes: NoteObject[];
  arrows: ArrowObject[];
  onNavigate?: () => void;
  uiConfig?: MobileUiConfig;
};

export function TableauNavigationControls({
  controls,
  tableau,
  notes,
  arrows,
  onNavigate,
  uiConfig
}: TableauNavigationControlsProps) {
  const initializedRef = useRef(false);

  function applyDefaultView(animationTime = 220) {
    onNavigate?.();
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;

    const transform = computeResetViewTransform(wrapper.clientWidth, wrapper.clientHeight);
    controls.setTransform(
      transform.positionX,
      transform.positionY,
      transform.scale,
      animationTime,
      "easeOut"
    );
  }

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    window.requestAnimationFrame(() => applyDefaultView(0));
  }, []);

  function centerAt(scale = controls.instance.transformState.scale) {
    onNavigate?.();
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;
    const targetCenterX = TABLEAU_DEFAULT_VIEW_BOUNDS.x + TABLEAU_DEFAULT_VIEW_BOUNDS.width / 2;
    const targetCenterY = TABLEAU_DEFAULT_VIEW_BOUNDS.y + TABLEAU_DEFAULT_VIEW_BOUNDS.height / 2;

    controls.setTransform(
      wrapper.clientWidth / 2 - targetCenterX * scale,
      wrapper.clientHeight / 2 - targetCenterY * scale,
      scale,
      220,
      "easeOut"
    );
  }

  function fitBoard() {
    applyDefaultView();
  }

  function fitBounds(bounds: TableauBounds, animationTime = 220, padding = TABLEAU_FIT_PADDING) {
    onNavigate?.();
    const wrapper = controls.instance.wrapperComponent;
    if (!wrapper) return;

    const transform = computeViewTransformForBounds(wrapper.clientWidth, wrapper.clientHeight, bounds, {
      padding,
      minScale: 0.2,
      maxScale: 2.6
    });
    controls.setTransform(
      transform.positionX,
      transform.positionY,
      transform.scale,
      animationTime,
      "easeOut"
    );
  }

  function fitAllCards() {
    const bounds = computeObjectBounds({ tableau, notes, arrows });
    if (!bounds) {
      fitBoard();
      return;
    }

    fitBounds(bounds);
  }

  const zoomPercent = Math.round(controls.instance.transformState.scale * 100);
  const showOnlyResetView = uiConfig?.showOnlyResetView ?? false;

  return (
    <div className="tableau-navigation-controls" data-testid="desk-navigation-controls">
      <div className="tableau-navigation-row">
        <button type="button" data-testid="reset-view-button" onClick={() => applyDefaultView()}>
          Reset
        </button>
        {!showOnlyResetView && (
          <>
            <button type="button" data-testid="center-view-button" onClick={() => centerAt()}>
              Center
            </button>
            <button type="button" data-testid="fit-board-button" onClick={fitBoard}>
              Fit Board
            </button>
          </>
        )}
      </div>
      {!showOnlyResetView && !uiConfig?.hideFitButtons && (
        <div className="tableau-navigation-row">
          <button type="button" data-testid="fit-cards-button" onClick={fitAllCards}>
            Fit Cards
          </button>
          {!uiConfig?.hideZoomButtons && (
            <>
              <button type="button" onClick={() => {
                onNavigate?.();
                controls.zoomOut(0.65);
              }} aria-label="Zoom out">
                -
              </button>
              <span className="zoom-readout">{zoomPercent}%</span>
              <button type="button" onClick={() => {
                onNavigate?.();
                controls.zoomIn(0.65);
              }} aria-label="Zoom in">
                +
              </button>
            </>
          )}
        </div>
      )}
      {!showOnlyResetView && !uiConfig?.hideBookmarks && (
        <div className="tableau-bookmark-grid" aria-label="Standard view bookmarks">
          {STANDARD_VIEW_BOOKMARKS.map((bookmark) => (
            <button
              key={bookmark.id}
              type="button"
              data-testid={`bookmark-${bookmark.id}`}
              onClick={() =>
                fitBounds(
                  bookmark.bounds,
                  220,
                  "padding" in bookmark ? bookmark.padding : TABLEAU_FIT_PADDING
                )
              }
            >
              {bookmark.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
