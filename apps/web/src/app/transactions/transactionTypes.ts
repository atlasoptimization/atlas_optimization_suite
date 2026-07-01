import type { AtlasWorkbenchState } from "../../atlas/core/types";

export type AtlasTransaction = {
  id: string;
  label: string;
  timestamp: string;
  before: AtlasWorkbenchState;
  after: AtlasWorkbenchState;
  affectedObjectIds: string[];
  apply: () => AtlasWorkbenchState;
  undo: () => AtlasWorkbenchState;
};

export type AtlasTransactionSummary = {
  id: string;
  label: string;
  affectedObjectIds: string[];
};
