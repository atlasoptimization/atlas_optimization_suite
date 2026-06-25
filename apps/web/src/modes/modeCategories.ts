import type { GameMode } from "../core/types/mode";

export type ModeCategory = {
  id: string;
  label: string;
  modeIds: string[];
};

export const MODE_CATEGORIES: ModeCategory[] = [
  {
    id: "recommended",
    label: "Recommended",
    modeIds: ["standard", "abstraction", "scripted-demo"]
  },
  {
    id: "free",
    label: "Free",
    modeIds: ["free", "minimalism"]
  },
  {
    id: "core",
    label: "Core / guided",
    modeIds: ["true-tarot", "true-bayes"]
  },
  {
    id: "source-abstraction",
    label: "Source / abstraction",
    modeIds: ["source-review"]
  },
  {
    id: "void-alternatives",
    label: "Void / alternatives",
    modeIds: ["shadows-vacuum", "everything-not", "void-cartography"]
  },
  {
    id: "model-diagnosis",
    label: "Model diagnosis",
    modeIds: ["model-archaeology", "model-lies", "model-dies", "ablation-study"]
  },
  {
    id: "volition-social",
    label: "Volition / social / pressure",
    modeIds: ["inheritance", "own-worst-enemy", "entropy-auction", "exam-clock", "midnight-calibration"]
  },
  {
    id: "spatial-creative",
    label: "Creative / outdoor / spatial",
    modeIds: ["painters-trace", "bench-and-forest", "landscape", "walk-in-the-park"]
  }
];

export function getModeCategory(mode: Pick<GameMode, "id">) {
  return MODE_CATEGORIES.find((category) => category.modeIds.includes(mode.id))?.label ?? "Custom";
}

export function groupModesByCategory(modes: GameMode[]) {
  const seen = new Set<string>();
  const groups = MODE_CATEGORIES.map((category) => {
    const categoryModes = category.modeIds
      .map((id) => modes.find((mode) => mode.id === id))
      .filter((mode): mode is GameMode => Boolean(mode));
    categoryModes.forEach((mode) => seen.add(mode.id));
    return {
      ...category,
      modes: categoryModes
    };
  }).filter((category) => category.modes.length > 0);

  const uncategorizedModes = modes.filter((mode) => !seen.has(mode.id));
  if (uncategorizedModes.length > 0) {
    groups.push({
      id: "custom",
      label: "Custom",
      modeIds: uncategorizedModes.map((mode) => mode.id),
      modes: uncategorizedModes
    });
  }

  return groups;
}
