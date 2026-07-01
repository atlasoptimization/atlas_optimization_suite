import type { AtlasCard, AtlasConnection } from "./types";
import { getNodeInputSlots, getNodeOutputPorts, type AtlasNodePort, type AtlasNodeSlot } from "./ports";

export type AtlasNodeTemplateId =
  | "VariableReferenceNode"
  | "ParameterReferenceNode"
  | "ConstantReferenceNode"
  | "AtomNode"
  | "OperatorNode"
  | "ConstraintNode"
  | "ObjectiveNode"
  | "ProblemNode";

export type AtlasNodeTemplate = {
  id: AtlasNodeTemplateId;
  title: (card: AtlasCard) => string;
  preview: (card: AtlasCard, allCards: AtlasCard[]) => string;
  inputSlots: (card: AtlasCard, connections: AtlasConnection[]) => AtlasNodeSlot[];
  outputPorts: (card: AtlasCard) => AtlasNodePort[];
  inspectorSections: string[];
  contextMenuCommandIds: string[];
  defaultSize: { width: number; height: number };
  acceptedDragDropBehavior: string[];
};

export const ATLAS_NODE_TEMPLATES: Record<AtlasNodeTemplateId, AtlasNodeTemplate> = {
  VariableReferenceNode: template("VariableReferenceNode", ["Summary", "Metadata", "Diagnostics"], ["workspace.deleteReference", "model.deleteCanonicalObject"]),
  ParameterReferenceNode: template("ParameterReferenceNode", ["Summary", "Properties", "Metadata"], ["workspace.deleteReference", "model.deleteCanonicalObject"]),
  ConstantReferenceNode: template("ConstantReferenceNode", ["Summary", "Properties", "Raw IR"], ["workspace.deleteReference", "model.deleteCanonicalObject"]),
  AtomNode: template("AtomNode", ["Summary", "Inputs / Outputs", "CVXPY Code", "Diagnostics"], ["workspace.connectPorts", "workspace.deleteReference"]),
  OperatorNode: template("OperatorNode", ["Summary", "Inputs / Outputs", "Diagnostics"], ["workspace.connectPorts", "workspace.deleteReference"]),
  ConstraintNode: template("ConstraintNode", ["Summary", "Inputs / Outputs", "Diagnostics"], ["workspace.connectPorts", "workspace.deleteReference"]),
  ObjectiveNode: template("ObjectiveNode", ["Summary", "Inputs / Outputs", "CVXPY Code"], ["workspace.connectPorts", "workspace.deleteReference"]),
  ProblemNode: template("ProblemNode", ["Summary", "Inputs / Outputs", "CVXPY Code", "Diagnostics"], ["workspace.connectPorts", "run.solve"])
};

export function getNodeTemplate(card: AtlasCard): AtlasNodeTemplate {
  const kind = card.modelObjectKind ?? cardTypeToModelKind(card.type);
  if (kind === "variable") return ATLAS_NODE_TEMPLATES.VariableReferenceNode;
  if (kind === "parameter") return ATLAS_NODE_TEMPLATES.ParameterReferenceNode;
  if (kind === "constant") return ATLAS_NODE_TEMPLATES.ConstantReferenceNode;
  if (kind === "constraint") return ATLAS_NODE_TEMPLATES.ConstraintNode;
  if (kind === "objective") return ATLAS_NODE_TEMPLATES.ObjectiveNode;
  if (kind === "problem") return ATLAS_NODE_TEMPLATES.ProblemNode;
  if (kind === "atom" && card.atomConfig?.symbolId?.startsWith("atlas.operator.")) return ATLAS_NODE_TEMPLATES.OperatorNode;
  return ATLAS_NODE_TEMPLATES.AtomNode;
}

function template(
  id: AtlasNodeTemplateId,
  inspectorSections: string[],
  contextMenuCommandIds: string[]
): AtlasNodeTemplate {
  return {
    id,
    title: (card) => card.title,
    preview: (card) => card.atomConfig?.displayName ?? card.title,
    inputSlots: getNodeInputSlots,
    outputPorts: getNodeOutputPorts,
    inspectorSections,
    contextMenuCommandIds,
    defaultSize: { width: 240, height: 160 },
    acceptedDragDropBehavior: ["connect-output-port", "place-reference"]
  };
}

function cardTypeToModelKind(cardType: AtlasCard["type"]) {
  if (cardType === "decision") return "variable";
  if (cardType === "data") return "data";
  if (cardType === "function") return "atom";
  return cardType;
}
