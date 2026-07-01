export type AtlasShapeMode = "scalar" | "vector" | "matrix" | "custom";

export type AtlasShapeDraft = {
  mode: AtlasShapeMode;
  vectorLength?: string;
  matrixRows?: string;
  matrixCols?: string;
  customShape?: string;
};

export type AtlasParsedShape =
  | { ok: true; shape: unknown; label: string; mode: AtlasShapeMode }
  | { ok: false; error: string };

export const CVXPY_VARIABLE_ATTRIBUTES = [
  "nonneg",
  "nonpos",
  "boolean",
  "integer",
  "symmetric",
  "PSD",
  "NSD",
  "complex",
  "imag",
  "hermitian",
  "pos",
  "neg"
] as const;

export function parseAtlasShapeDraft(draft: AtlasShapeDraft): AtlasParsedShape {
  if (draft.mode === "scalar") return { ok: true, shape: "scalar", label: "scalar", mode: "scalar" };
  if (draft.mode === "vector") {
    const length = parsePositiveInteger(draft.vectorLength ?? "");
    if (!length) return { ok: false, error: "Vector length must be a positive integer." };
    return { ok: true, shape: length, label: `shape=(${length},)`, mode: "vector" };
  }
  if (draft.mode === "matrix") {
    const rows = parsePositiveInteger(draft.matrixRows ?? "");
    const cols = parsePositiveInteger(draft.matrixCols ?? "");
    if (!rows || !cols) return { ok: false, error: "Matrix rows and columns must be positive integers." };
    return { ok: true, shape: [rows, cols], label: `shape=(${rows}, ${cols})`, mode: "matrix" };
  }

  const dimensions = parseCustomShape(draft.customShape ?? "");
  if (!dimensions) return { ok: false, error: "Custom shape must be a tuple/list of positive integers, e.g. (20,) or (3, 2)." };
  return {
    ok: true,
    shape: dimensions.length === 1 ? dimensions[0] : dimensions,
    label: `shape=(${dimensions.join(", ")}${dimensions.length === 1 ? "," : ""})`,
    mode: "custom"
  };
}

export function atlasShapeLabel(shape: unknown): string {
  if (shape === "scalar" || shape === undefined || shape === null) return "scalar";
  if (shape === "vector") return "vector";
  if (shape === "matrix") return "matrix";
  if (typeof shape === "number" && Number.isInteger(shape) && shape > 0) return `shape=(${shape},)`;
  if (Array.isArray(shape) && shape.every((item) => Number.isInteger(item) && item > 0)) {
    return `shape=(${shape.join(", ")})`;
  }
  if (typeof shape === "object" && shape !== null && "dimensions" in shape) {
    const dimensions = (shape as { dimensions?: unknown }).dimensions;
    if (Array.isArray(dimensions)) return atlasShapeLabel(dimensions);
  }
  return "shape unknown";
}

export function compactValuePreview(value: unknown): string {
  if (value === undefined || value === null || value === "") return "value=--";
  if (Array.isArray(value)) return `value=${JSON.stringify(value).slice(0, 32)}`;
  if (typeof value === "object") return "value={...}";
  return `value=${String(value).slice(0, 32)}`;
}

function parsePositiveInteger(value: string): number | null {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 && String(parsed) === value.trim() ? parsed : null;
}

function parseCustomShape(value: string): number[] | null {
  const normalized = value.trim().replace(/^\(/, "").replace(/\)$/, "").replace(/^\[/, "").replace(/\]$/, "");
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const dimensions = parts.map((part) => parsePositiveInteger(part));
  if (dimensions.some((dimension) => dimension === null)) return null;
  return dimensions as number[];
}
