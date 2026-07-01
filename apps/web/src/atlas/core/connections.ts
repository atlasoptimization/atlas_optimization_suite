import type { AtlasAtomInput, AtlasConnection, AtlasConnectionEndpoint, AtlasWorkbenchState } from "./types";
import { validatePortConnection } from "./ports";

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
  const compatibility = validatePortConnection(source, target, state.cards, state.connections);
  if (!compatibility.ok) return state;
  const connection = createAtlasConnection(source, target, semanticKind);
  const duplicate = state.connections.some(
    (existing) =>
      existing.source.nodeId === connection.source.nodeId &&
      existing.source.port === connection.source.port &&
      existing.target.nodeId === connection.target.nodeId &&
      existing.target.slot === connection.target.slot
  );
  const nextState = {
    ...state,
    connections: duplicate ? state.connections : [...state.connections, connection]
  };
  return duplicate ? nextState : applyConnectionToTarget(nextState, connection);
}

export function deleteAtlasConnection(
  state: AtlasWorkbenchState,
  connectionId: string
): AtlasWorkbenchState {
  const connection = state.connections.find((candidate) => candidate.id === connectionId);
  const withoutConnection = {
    ...state,
    connections: state.connections.filter((candidate) => candidate.id !== connectionId)
  };
  if (!connection) return withoutConnection;
  return removeConnectionFromTarget(withoutConnection, connection);
}

function applyConnectionToTarget(state: AtlasWorkbenchState, connection: AtlasConnection): AtlasWorkbenchState {
  const targetObjectId = connection.target.objectId;
  if (!targetObjectId) return state;
  const sourceInput: AtlasAtomInput = {
    id: connection.target.slot ?? "arg0",
    name: connection.target.slot ?? "arg0",
    kind: "reference",
    objectId: connection.source.objectId,
    nodeId: connection.source.nodeId
  };
  return {
    ...state,
    cards: state.cards.map((card) => {
      if ((card.modelObjectId ?? card.id) !== targetObjectId) return card;
      if (card.atomConfig) {
        return { ...card, atomConfig: connectAtomInput(card.atomConfig, sourceInput) };
      }
      if (card.objective && connection.target.slot?.startsWith("term")) {
        const termId = connection.target.slot;
        const existing = card.objective.terms.find((term) => term.id === termId);
        return {
          ...card,
          objective: {
            ...card.objective,
            terms: existing
              ? card.objective.terms.map((term) =>
                  term.id === termId ? { ...term, functionCardId: connection.source.objectId ?? null } : term
                )
              : [
                  ...card.objective.terms,
                  {
                    id: termId,
                    name: termId,
                    functionCardId: connection.source.objectId ?? null
                  }
                ]
          }
        };
      }
      if (card.constraint && (connection.target.slot === "lhs" || connection.target.slot === "rhs")) {
        const expression = { kind: "function_ref" as const, functionCardId: connection.source.objectId ?? null };
        return {
          ...card,
          constraint: {
            ...card.constraint,
            [connection.target.slot === "lhs" ? "left" : "right"]: expression
          }
        };
      }
      return card;
    })
  };
}

function removeConnectionFromTarget(state: AtlasWorkbenchState, connection: AtlasConnection): AtlasWorkbenchState {
  const targetObjectId = connection.target.objectId;
  if (!targetObjectId) return state;
  return {
    ...state,
    cards: state.cards.map((card) => {
      if ((card.modelObjectId ?? card.id) !== targetObjectId) return card;
      if (card.atomConfig) {
        return { ...card, atomConfig: disconnectAtomInput(card.atomConfig, connection.target.slot ?? "arg0") };
      }
      if (card.objective && connection.target.slot?.startsWith("term")) {
        return {
          ...card,
          objective: {
            ...card.objective,
            terms: card.objective.terms.map((term) =>
              term.id === connection.target.slot ? { ...term, functionCardId: null } : term
            )
          }
        };
      }
      if (card.constraint && (connection.target.slot === "lhs" || connection.target.slot === "rhs")) {
        return {
          ...card,
          constraint: {
            ...card.constraint,
            [connection.target.slot === "lhs" ? "left" : "right"]: { kind: "constant" as const, value: 0 }
          }
        };
      }
      return card;
    })
  };
}

function connectAtomInput(atomConfig: NonNullable<AtlasWorkbenchState["cards"][number]["atomConfig"]>, input: AtlasAtomInput) {
  const slotIndex = slotIndexFromId(input.id);
  if (slotIndex !== null && atomConfig.positionalInputs[slotIndex]) {
    return {
      ...atomConfig,
      positionalInputs: atomConfig.positionalInputs.map((candidate, index) =>
        index === slotIndex ? { ...candidate, kind: "reference" as const, objectId: input.objectId, nodeId: input.nodeId } : candidate
      )
    };
  }
  if (input.name in atomConfig.keywordInputs) {
    return {
      ...atomConfig,
      keywordInputs: {
        ...atomConfig.keywordInputs,
        [input.name]: { ...atomConfig.keywordInputs[input.name], kind: "reference" as const, objectId: input.objectId, nodeId: input.nodeId }
      }
    };
  }
  return atomConfig;
}

function disconnectAtomInput(atomConfig: NonNullable<AtlasWorkbenchState["cards"][number]["atomConfig"]>, slotId: string) {
  const slotIndex = slotIndexFromId(slotId);
  if (slotIndex !== null && atomConfig.positionalInputs[slotIndex]) {
    return {
      ...atomConfig,
      positionalInputs: atomConfig.positionalInputs.map((candidate, index) =>
        index === slotIndex ? { ...candidate, objectId: undefined, nodeId: undefined } : candidate
      )
    };
  }
  if (slotId in atomConfig.keywordInputs) {
    return {
      ...atomConfig,
      keywordInputs: {
        ...atomConfig.keywordInputs,
        [slotId]: { ...atomConfig.keywordInputs[slotId], objectId: undefined, nodeId: undefined }
      }
    };
  }
  return atomConfig;
}

function slotIndexFromId(slotId: string): number | null {
  const match = slotId.match(/^arg_?(\d+)$/);
  if (!match) return null;
  return Number.parseInt(match[1], 10);
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
