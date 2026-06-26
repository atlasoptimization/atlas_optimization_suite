import type {
  AtlasCardModule,
  AtlasCardModuleKind,
  AtlasPosition,
  AtlasWorkbenchState
} from "./types";

const DEFAULT_LABELS: Record<AtlasCardModuleKind, string> = {
  tag: "type",
  trait: "dimension",
  property: "cost",
  diagnostic: "status",
  note: "note"
};

export function createAtlasModule(
  kind: AtlasCardModuleKind,
  options: Partial<AtlasCardModule> = {}
): AtlasCardModule {
  return {
    id: options.id ?? `module_${Math.random().toString(36).slice(2, 9)}`,
    kind,
    label: options.label?.trim() || DEFAULT_LABELS[kind],
    value: options.value ?? "",
    unit: options.unit,
    notes: options.notes,
    position: options.position ?? { x: 12, y: 12 }
  };
}

export function attachAtlasModule(
  state: AtlasWorkbenchState,
  cardId: string,
  kind: AtlasCardModuleKind,
  options: Partial<AtlasCardModule> = {}
): AtlasWorkbenchState {
  const module = createAtlasModule(kind, options);
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId ? { ...card, modules: [...(card.modules ?? []), module] } : card
    )
  };
}

export function updateAtlasModule(
  state: AtlasWorkbenchState,
  cardId: string,
  moduleId: string,
  patch: Partial<Pick<AtlasCardModule, "label" | "value" | "unit" | "notes" | "position">>
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? {
            ...card,
            modules: (card.modules ?? []).map((module) =>
              module.id === moduleId ? normalizeModulePatch(module, patch) : module
            )
          }
        : card
    )
  };
}

export function deleteAtlasModule(
  state: AtlasWorkbenchState,
  cardId: string,
  moduleId: string
): AtlasWorkbenchState {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId
        ? { ...card, modules: (card.modules ?? []).filter((module) => module.id !== moduleId) }
        : card
    )
  };
}

function normalizeModulePatch(
  module: AtlasCardModule,
  patch: Partial<Pick<AtlasCardModule, "label" | "value" | "unit" | "notes" | "position">>
) {
  const position: AtlasPosition | undefined = patch.position
    ? { x: Math.round(patch.position.x), y: Math.round(patch.position.y) }
    : module.position;
  return {
    ...module,
    label: patch.label !== undefined ? patch.label.trim() || module.label : module.label,
    value: patch.value !== undefined ? patch.value : module.value,
    unit: patch.unit !== undefined ? patch.unit || undefined : module.unit,
    notes: patch.notes !== undefined ? patch.notes || undefined : module.notes,
    position
  };
}
