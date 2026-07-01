import { atlasReducer } from "../../atlas/core/reducer";
import type { AtlasAction, AtlasWorkbenchState } from "../../atlas/core/types";
import type { AtlasTransaction } from "./transactionTypes";

export function createStateTransaction(
  label: string,
  before: AtlasWorkbenchState,
  after: AtlasWorkbenchState,
  affectedObjectIds: string[] = []
): AtlasTransaction {
  const id = `txn_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const beforeSnapshot = cloneState(before);
  const afterSnapshot = cloneState(after);
  return {
    id,
    label,
    timestamp: new Date().toISOString(),
    before: beforeSnapshot,
    after: afterSnapshot,
    affectedObjectIds,
    apply: () => cloneState(afterSnapshot),
    undo: () => cloneState(beforeSnapshot)
  };
}

export function createActionTransaction(
  label: string,
  before: AtlasWorkbenchState,
  action: AtlasAction,
  affectedObjectIds: string[] = inferAffectedObjectIds(action)
): AtlasTransaction {
  return createStateTransaction(label, before, atlasReducer(before, action), affectedObjectIds);
}

export function applyTransaction(transaction: AtlasTransaction): AtlasWorkbenchState {
  return transaction.apply();
}

export function undoTransaction(transaction: AtlasTransaction): AtlasWorkbenchState {
  return transaction.undo();
}

export function inferAffectedObjectIds(action: AtlasAction): string[] {
  switch (action.type) {
    case "modelObject.delete":
    case "modelObject.rename":
      return [action.modelObjectId];
    case "workspaceReference.create":
      return [action.modelObjectId];
    case "workspaceReference.duplicate":
    case "card.delete":
    case "card.update":
    case "card.move":
      return [action.cardId];
    case "connection.create":
      return [
        action.source.objectId,
        action.source.nodeId,
        action.target.objectId,
        action.target.nodeId
      ].filter((id): id is string => Boolean(id));
    case "connection.delete":
      return [action.connectionId];
    default:
      return [];
  }
}

function cloneState(state: AtlasWorkbenchState): AtlasWorkbenchState {
  return JSON.parse(JSON.stringify(state)) as AtlasWorkbenchState;
}
