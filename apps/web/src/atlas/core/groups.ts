import type { AtlasGroup, AtlasWorkbenchState } from "./types";

export function createAtlasGroup(
  options: Partial<Pick<AtlasGroup, "id" | "title" | "position" | "size" | "color" | "notes">> = {}
): AtlasGroup {
  return {
    id: options.id ?? makeAtlasId("group"),
    title: options.title ?? "Group",
    position: options.position ?? { x: 620, y: 560 },
    size: options.size ?? { width: 720, height: 420 },
    color: options.color,
    notes: options.notes ?? ""
  };
}

export function addAtlasGroup(state: AtlasWorkbenchState, id?: string): AtlasWorkbenchState {
  const group = createAtlasGroup({
    id,
    position: {
      x: 560 + (state.groups.length % 3) * 120,
      y: 520 + (state.groups.length % 3) * 90
    }
  });

  return {
    ...state,
    groups: [...state.groups, group],
    selectedCardId: null,
    selectedGroupId: group.id,
    selectedQueryId: null
  };
}

export function updateAtlasGroup(
  state: AtlasWorkbenchState,
  groupId: string,
  patch: Partial<Pick<AtlasGroup, "title" | "position" | "size" | "color" | "notes">>
): AtlasWorkbenchState {
  return {
    ...state,
    groups: state.groups.map((group) =>
      group.id === groupId
        ? {
            ...group,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() || "Group" : group.title,
            size: patch.size ? normalizeGroupSize(patch.size) : group.size
          }
        : group
    )
  };
}

export function deleteAtlasGroup(state: AtlasWorkbenchState, groupId: string): AtlasWorkbenchState {
  return {
    ...state,
    groups: state.groups.filter((group) => group.id !== groupId),
    selectedGroupId: state.selectedGroupId === groupId ? null : state.selectedGroupId
  };
}

export function getSelectedAtlasGroup(state: AtlasWorkbenchState) {
  return state.groups.find((group) => group.id === state.selectedGroupId) ?? null;
}

function normalizeGroupSize(size: AtlasGroup["size"]) {
  return {
    width: Math.max(180, Math.round(size.width)),
    height: Math.max(120, Math.round(size.height))
  };
}

function makeAtlasId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
