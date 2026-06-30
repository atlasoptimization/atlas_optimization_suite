import type { AtlasConnection, AtlasConnectionEndpoint, AtlasWorkbenchState } from "./types";

export function createAtlasConnection(
  source: AtlasConnectionEndpoint,
  target: AtlasConnectionEndpoint,
  semanticKind = "expression_input",
  id = makeConnectionId(source, target)
): AtlasConnection {
  return {
    id,
    source: { ...source },
    target: { ...target },
    semanticReference: {
      kind: semanticKind,
      objectId: source.objectId
    }
  };
}

export function addAtlasConnection(
  state: AtlasWorkbenchState,
  source: AtlasConnectionEndpoint,
  target: AtlasConnectionEndpoint,
  semanticKind?: string
): AtlasWorkbenchState {
  const connection = createAtlasConnection(source, target, semanticKind);
  const duplicate = state.connections.some(
    (existing) =>
      existing.source.nodeId === connection.source.nodeId &&
      existing.source.port === connection.source.port &&
      existing.target.nodeId === connection.target.nodeId &&
      existing.target.slot === connection.target.slot
  );
  return {
    ...state,
    connections: duplicate ? state.connections : [...state.connections, connection]
  };
}

export function deleteAtlasConnection(
  state: AtlasWorkbenchState,
  connectionId: string
): AtlasWorkbenchState {
  return {
    ...state,
    connections: state.connections.filter((connection) => connection.id !== connectionId)
  };
}

export function getInvalidAtlasConnections(state: AtlasWorkbenchState) {
  const nodeIds = new Set(state.cards.map((card) => card.id));
  return state.connections.filter(
    (connection) =>
      (connection.source.nodeId && !nodeIds.has(connection.source.nodeId)) ||
      (connection.target.nodeId && !nodeIds.has(connection.target.nodeId))
  );
}

function makeConnectionId(source: AtlasConnectionEndpoint, target: AtlasConnectionEndpoint) {
  return `connection_${source.nodeId ?? source.objectId}_${source.port ?? "out"}_${target.nodeId ?? target.objectId}_${target.slot ?? "in"}`;
}
