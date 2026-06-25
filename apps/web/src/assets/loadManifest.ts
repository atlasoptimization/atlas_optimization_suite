import type { DeckManifest } from "../core/types/card";
import { resolvePublicAssetUrl } from "./publicAssetUrl";

export async function loadManifest(): Promise<DeckManifest> {
  const manifestUrl = resolvePublicAssetUrl("deck/manifest.json");
  if (!manifestUrl) throw new Error("Could not resolve deck manifest URL.");
  const response = await fetch(manifestUrl);

  if (!response.ok) {
    throw new Error(`Could not load ${manifestUrl}. Run: pnpm sync:assets`);
  }

  return response.json() as Promise<DeckManifest>;
}
