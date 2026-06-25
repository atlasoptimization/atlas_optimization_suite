import type { CSSProperties } from "react";
import { ACTIVE_BOARD_BOUNDS } from "../../core/constants/tableau";
import type { TopologyImageSource, ZoneVisibility } from "../../core/types/view";
import { STAGING_LANE_BOUNDS } from "../../engine/placement/domainPlacement";
import {
  getTopologyBackgroundOpacity,
  getTopologyBackgroundPath,
  type TopologyBackgroundMap
} from "./topologyBackgrounds";

type DomainZoneOverlayProps = {
  visibility: Exclude<ZoneVisibility, "hidden">;
  imageSource: TopologyImageSource;
  backgrounds?: TopologyBackgroundMap;
};

const OVERLAY_ORIGIN = {
  x: ACTIVE_BOARD_BOUNDS.x,
  y: ACTIVE_BOARD_BOUNDS.y
};

const OVERLAY_SIZE = {
  width: ACTIVE_BOARD_BOUNDS.width,
  height: ACTIVE_BOARD_BOUNDS.height
};

export function DomainZoneOverlay({
  visibility,
  imageSource,
  backgrounds
}: DomainZoneOverlayProps) {
  const imageOpacity = getTopologyBackgroundOpacity(visibility, imageSource);
  const stagingStyle = {
    left: STAGING_LANE_BOUNDS.x - OVERLAY_ORIGIN.x,
    top: STAGING_LANE_BOUNDS.y - OVERLAY_ORIGIN.y,
    width: STAGING_LANE_BOUNDS.width,
    height: STAGING_LANE_BOUNDS.height
  };
  const zoneBackgroundStyle = (domain: string) => {
    const path = getTopologyBackgroundPath(backgrounds, domain, imageSource);
    return {
      "--zone-bg-image": path ? `url("${path}")` : "none",
      "--zone-bg-opacity": imageOpacity
    } as CSSProperties;
  };

  return (
    <div
      className={`domain-zone-overlay zone-visibility-${visibility}`}
      style={{
        left: OVERLAY_ORIGIN.x,
        top: OVERLAY_ORIGIN.y,
        width: OVERLAY_SIZE.width,
        height: OVERLAY_SIZE.height
      }}
    >
      <div className="staging-lane-zone" style={stagingStyle}>
        <strong>DRAWN CARDS</strong>
        <span className="staging-marker staging-marker-aspect">ASPECT</span>
        <span className="staging-marker staging-marker-volition">VOLITION</span>
        <span className="staging-marker staging-marker-void">VOID</span>
        <span className="staging-marker staging-marker-model">CHAMELEON / STRUCTURE</span>
        <span className="staging-marker staging-marker-source">SOURCE</span>
      </div>
      <div className="topology-map">
        <div className="zone zone-volition" style={zoneBackgroundStyle("Volition")}>
          <span className="zone-background-image" aria-hidden="true" />
          <span className="zone-label">VOLITION</span>
        </div>
        <div className="zone zone-void" style={zoneBackgroundStyle("Void")}>
          <span className="zone-background-image" aria-hidden="true" />
          <span className="zone-label zone-label-void">VOID</span>
          <div className="model-chambers">
            <div className="zone zone-chameleon" style={zoneBackgroundStyle("Chameleon")}>
              <span className="zone-background-image" aria-hidden="true" />
              <span className="zone-label">CHAMELEON</span>
            </div>
            <div className="zone zone-structure" style={zoneBackgroundStyle("Structure")}>
              <span className="zone-background-image" aria-hidden="true" />
              <span className="zone-label">STRUCTURE</span>
            </div>
          </div>
        </div>
        <div className="zone zone-source" style={zoneBackgroundStyle("Source")}>
          <span className="zone-background-image" aria-hidden="true" />
          <span className="zone-label">SOURCE</span>
        </div>
      </div>
    </div>
  );
}
