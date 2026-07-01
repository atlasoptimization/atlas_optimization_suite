import type { AtlasCard, AtlasConnection, AtlasConnectionEndpoint } from "./types";

export type AtlasPortType =
  | "expression"
  | "scalar_expression"
  | "vector_expression"
  | "matrix_expression"
  | "constraint"
  | "constraint_list"
  | "objective"
  | "problem"
  | "data"
  | "solver_option"
  | "any_expression";

export type AtlasNodeSlot = {
  id: string;
  label: string;
  acceptedTypes: AtlasPortType[];
  required: boolean;
  variadic: boolean;
  sourceArgumentName?: string;
  currentConnectionIds: string[];
};

export type AtlasNodePort = {
  id: string;
  label: string;
  outputType: AtlasPortType;
  shape?: unknown;
  objectId?: string;
};

export type AtlasConnectionValidation =
  | { ok: true; certainty: "certain" | "backend"; diagnostic?: string }
  | { ok: false; diagnostic: string };

const EXPRESSION_TYPES = new Set<AtlasPortType>([
  "expression",
  "scalar_expression",
  "vector_expression",
  "matrix_expression",
  "any_expression"
]);

export function validatePortConnection(
  source: AtlasNodePort | AtlasConnectionEndpoint,
  target: AtlasNodeSlot | AtlasConnectionEndpoint,
  cards: AtlasCard[] = [],
  connections: AtlasConnection[] = []
): AtlasConnectionValidation {
  const sourcePort = "outputType" in source ? source : resolveOutputPort(source, cards);
  const targetSlot = "acceptedTypes" in target ? target : resolveInputSlot(target, cards, connections);
  if (!sourcePort || !targetSlot) {
    return { ok: true, certainty: "backend", diagnostic: "Connection endpoint type is incomplete; backend validation required." };
  }
  if (isPortAccepted(sourcePort.outputType, targetSlot.acceptedTypes)) return { ok: true, certainty: "certain" };
  return {
    ok: false,
    diagnostic: `${sourcePort.outputType} cannot connect to ${targetSlot.label}; accepted: ${targetSlot.acceptedTypes.join(", ")}.`
  };
}

export function isPortAccepted(outputType: AtlasPortType, acceptedTypes: AtlasPortType[]) {
  if (acceptedTypes.includes(outputType)) return true;
  if (acceptedTypes.includes("any_expression") && EXPRESSION_TYPES.has(outputType)) return true;
  if (outputType === "scalar_expression" && acceptedTypes.includes("expression")) return true;
  if (outputType === "vector_expression" && acceptedTypes.includes("expression")) return true;
  if (outputType === "matrix_expression" && acceptedTypes.includes("expression")) return true;
  return false;
}

export function resolveOutputPort(endpoint: AtlasConnectionEndpoint, cards: AtlasCard[]): AtlasNodePort | null {
  const card = findEndpointCard(endpoint, cards);
  if (!card) return null;
  return getNodeOutputPorts(card).find((port) => port.id === (endpoint.port ?? "expression")) ?? null;
}

export function resolveInputSlot(
  endpoint: AtlasConnectionEndpoint,
  cards: AtlasCard[],
  connections: AtlasConnection[]
): AtlasNodeSlot | null {
  const card = findEndpointCard(endpoint, cards);
  if (!card) return null;
  return getNodeInputSlots(card, connections).find((slot) => slot.id === endpoint.slot) ?? null;
}

export function getNodeOutputPorts(card: AtlasCard): AtlasNodePort[] {
  const kind = card.modelObjectKind ?? cardTypeToModelKind(card.type);
  if (kind === "constraint") {
    return [{ id: "constraint", label: card.title, outputType: "constraint", objectId: card.modelObjectId ?? card.id }];
  }
  if (kind === "objective") {
    return [{ id: "objective", label: card.title, outputType: "objective", objectId: card.modelObjectId ?? card.id }];
  }
  if (kind === "problem") {
    return [{ id: "problem", label: card.title, outputType: "problem", objectId: card.modelObjectId ?? card.id }];
  }
  if (kind === "data") {
    return [{ id: "data", label: card.title, outputType: "data", objectId: card.modelObjectId ?? card.id }];
  }
  if (kind === "variable" || kind === "parameter" || kind === "constant" || kind === "atom" || kind === "expression") {
    return [{
      id: "expression",
      label: card.atomConfig?.outputName ?? card.title,
      outputType: shapeToPortType(card.modelObjectShape),
      shape: card.modelObjectShape,
      objectId: card.modelObjectId ?? card.id
    }];
  }
  return [{ id: "expression", label: card.title, outputType: "expression", objectId: card.modelObjectId ?? card.id }];
}

export function getNodeInputSlots(card: AtlasCard, connections: AtlasConnection[] = []): AtlasNodeSlot[] {
  const kind = card.modelObjectKind ?? cardTypeToModelKind(card.type);
  if (kind === "atom" || kind === "expression") {
    return (card.atomConfig?.positionalInputs ?? []).map((input, index) => ({
      id: `arg${index}`,
      label: input.name || `arg ${index + 1}`,
      acceptedTypes: ["any_expression"],
      required: true,
      variadic: isVariadicAtomArgument(card, input.name),
      sourceArgumentName: input.name,
      currentConnectionIds: connectionIdsForSlot(card, `arg${index}`, connections)
    }));
  }
  if (kind === "constraint") {
    return [
      slot(card, "lhs", "LHS", ["any_expression"], true, connections),
      slot(card, "rhs", "RHS", ["any_expression"], true, connections)
    ];
  }
  if (kind === "objective") {
    return [
      slot(card, "term0", card.objective?.direction ?? "term", ["any_expression"], true, connections, true),
      slot(card, "term1", "term +", ["any_expression"], false, connections, true)
    ];
  }
  if (kind === "problem") {
    return [
      slot(card, "objective", "objective", ["objective"], true, connections),
      slot(card, "constraints", "constraints", ["constraint", "constraint_list"], false, connections, true)
    ];
  }
  return [];
}

function slot(
  card: AtlasCard,
  id: string,
  label: string,
  acceptedTypes: AtlasPortType[],
  required: boolean,
  connections: AtlasConnection[],
  variadic = false
): AtlasNodeSlot {
  return { id, label, acceptedTypes, required, variadic, currentConnectionIds: connectionIdsForSlot(card, id, connections) };
}

function isVariadicAtomArgument(card: AtlasCard, argumentName: string) {
  const ui = card.atomSpec?.uiOverrides?.ui;
  const hints = isRecord(ui) && isRecord(ui.argumentUiHints) ? ui.argumentUiHints : undefined;
  const hint = hints?.[argumentName];
  return isRecord(hint) && hint.widget === "variadic_expression_list";
}

function connectionIdsForSlot(card: AtlasCard, slotId: string, connections: AtlasConnection[]) {
  const objectId = card.modelObjectId ?? card.id;
  return connections
    .filter((connection) => (connection.target.nodeId === card.id || connection.target.objectId === objectId) && connection.target.slot === slotId)
    .map((connection) => connection.id);
}

function shapeToPortType(shape: unknown): AtlasPortType {
  if (Array.isArray(shape) && shape.length === 1) return "vector_expression";
  if (Array.isArray(shape) && shape.length === 2) return "matrix_expression";
  if (shape === "vector") return "vector_expression";
  if (shape === "matrix") return "matrix_expression";
  if (shape === "scalar" || shape === undefined || shape === null) return "scalar_expression";
  return "expression";
}

function findEndpointCard(endpoint: AtlasConnectionEndpoint, cards: AtlasCard[]) {
  return cards.find((card) => card.id === endpoint.nodeId || (card.modelObjectId ?? card.id) === endpoint.objectId);
}

function cardTypeToModelKind(cardType: AtlasCard["type"]) {
  if (cardType === "decision") return "variable";
  if (cardType === "data") return "data";
  if (cardType === "function") return "atom";
  return cardType;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
