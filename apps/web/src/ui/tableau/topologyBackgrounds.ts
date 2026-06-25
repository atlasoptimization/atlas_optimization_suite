import type { DeckManifest } from "../../core/types/card";
import type { TopologyImageSource, ZoneVisibility } from "../../core/types/view";
import { resolvePublicAssetUrl } from "../../assets/publicAssetUrl";

export type TopologyBackgroundMap = NonNullable<DeckManifest["topologyBackgrounds"]>;

export function getTopologyBackgroundPath(
  backgrounds: TopologyBackgroundMap | undefined,
  domain: string,
  source: TopologyImageSource
) {
  if (!backgrounds || source === "none") return null;
  return resolvePublicAssetUrl(backgrounds[domain]?.[source]);
}

export function getTopologyBackgroundOpacity(
  visibility: ZoneVisibility,
  source: TopologyImageSource
) {
  if (visibility === "hidden" || source === "none") return 0;
  if (visibility === "subtle") return 0.16;
  if (visibility === "strong") return 0.46;
  return 0.3;
}
