import type { AtlasEvaluationMode } from "../../atlas/core/evaluator";
import type { AtlasWorkbenchView } from "../../atlas/ui/views/AtlasMultiView";
import type { AtlasConnectionEndpoint, AtlasWorkbenchState } from "../../atlas/core/types";
import type { AtlasTransaction } from "../transactions/transactionTypes";

export type AtlasCanonicalCommandId =
  | "file.newModel"
  | "file.clearDesk"
  | "file.saveProject"
  | "file.loadProject"
  | "file.exportIr"
  | "file.importIr"
  | "edit.undo"
  | "edit.redo"
  | "edit.deleteSelected"
  | "edit.renameSelected"
  | "view.switchView"
  | "view.togglePanel"
  | "workspace.placeReference"
  | "workspace.deleteReference"
  | "workspace.connectPorts"
  | "workspace.deleteConnection"
  | "model.defineVariable"
  | "model.defineParameter"
  | "model.defineConstant"
  | "model.defineAtom"
  | "model.deleteCanonicalObject"
  | "run.validate"
  | "run.generateCode"
  | "run.solve"
  | "run.evaluateCurrent"
  | "run.evaluateSolution"
  | "dialog.openDefineObject"
  | "dialog.openConfirm";

export type AtlasCommandMenuLocation = "File" | "Edit" | "View" | "Run" | "Model" | "Workspace" | "Dialog";

export type AtlasCommandContext = {
  state: AtlasWorkbenchState;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedView?: AtlasWorkbenchView;
  supportsSolve?: boolean;
  supportsValidate?: boolean;
  supportsGenerateCode?: boolean;
  supportsEvaluate?: boolean;
};

export type AtlasCommandPayload = {
  modelObjectId?: string;
  cardId?: string;
  connectionId?: string;
  name?: string;
  view?: AtlasWorkbenchView;
  panelId?: string;
  source?: AtlasConnectionEndpoint;
  target?: AtlasConnectionEndpoint;
  evaluationMode?: AtlasEvaluationMode;
  [key: string]: unknown;
};

export type AtlasCommandExecutionResult = {
  transaction?: AtlasTransaction;
  message?: string;
  staleModelDerivedState?: boolean;
};

export type AtlasCommandDescriptor = {
  id: AtlasCanonicalCommandId;
  label: string;
  description?: string;
  shortcut?: string;
  menu?: AtlasCommandMenuLocation;
  enabled: (context: AtlasCommandContext, payload?: AtlasCommandPayload) => boolean;
  visible?: (context: AtlasCommandContext, payload?: AtlasCommandPayload) => boolean;
  execute: (
    context: AtlasCommandContext,
    payload?: AtlasCommandPayload
  ) => AtlasCommandExecutionResult | Promise<AtlasCommandExecutionResult>;
};
