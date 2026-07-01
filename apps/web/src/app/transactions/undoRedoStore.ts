import type { AtlasWorkbenchState } from "../../atlas/core/types";
import type { AtlasTransaction } from "./transactionTypes";

export type AtlasUndoRedoStore = {
  present: AtlasWorkbenchState;
  undoStack: AtlasTransaction[];
  redoStack: AtlasTransaction[];
};

export function createUndoRedoStore(present: AtlasWorkbenchState): AtlasUndoRedoStore {
  return { present, undoStack: [], redoStack: [] };
}

export function commitTransaction(
  store: AtlasUndoRedoStore,
  transaction: AtlasTransaction,
  limit = 100
): AtlasUndoRedoStore {
  return {
    present: transaction.apply(),
    undoStack: [...store.undoStack, transaction].slice(-limit),
    redoStack: []
  };
}

export function undo(store: AtlasUndoRedoStore): AtlasUndoRedoStore {
  const transaction = store.undoStack.at(-1);
  if (!transaction) return store;
  return {
    present: transaction.undo(),
    undoStack: store.undoStack.slice(0, -1),
    redoStack: [transaction, ...store.redoStack]
  };
}

export function redo(store: AtlasUndoRedoStore): AtlasUndoRedoStore {
  const transaction = store.redoStack[0];
  if (!transaction) return store;
  return {
    present: transaction.apply(),
    undoStack: [...store.undoStack, transaction],
    redoStack: store.redoStack.slice(1)
  };
}
