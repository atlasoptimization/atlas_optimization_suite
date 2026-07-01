import rawCvxpySymbolCatalog from "../../generated/cvxpy_symbols.generated.json?raw";
import type { AtlasAtomSpec } from "./atoms";

export type GeneratedSymbolArgument = {
  name: string;
  kind?: string;
  default?: unknown;
  ui?: Record<string, unknown> | null;
};

export type GeneratedSymbolSpec = {
  id: string;
  name: string;
  kind: string;
  importPath?: string | null;
  module?: string | null;
  signature?: string;
  arguments?: GeneratedSymbolArgument[];
  defaultValues?: Record<string, string>;
  doc?: string;
  category?: string;
  source?: string;
  callable?: boolean;
  ui?: Record<string, unknown> | null;
  symbol?: string | null;
  examples?: string[];
  warning?: string | null;
  note?: string | null;
};

export type GeneratedSymbolCatalog = {
  schemaVersion: string;
  cvxpyVersion?: string | null;
  generatedAt: string;
  symbols: GeneratedSymbolSpec[];
};

const ATOM_PALETTE_KINDS = new Set(["atom", "affine", "shape", "operator", "constraint_operator"]);

export const GENERATED_CVXPY_SYMBOL_CATALOG = JSON.parse(rawCvxpySymbolCatalog) as GeneratedSymbolCatalog;

export const GENERATED_CVXPY_ATOM_SPECS: AtlasAtomSpec[] = GENERATED_CVXPY_SYMBOL_CATALOG.symbols
  .filter((symbol) => ATOM_PALETTE_KINDS.has(symbol.kind))
  .map(symbolToAtomSpec)
  .sort((left, right) => left.name.localeCompare(right.name));

export function symbolToAtomSpec(symbol: GeneratedSymbolSpec): AtlasAtomSpec {
  return {
    symbolId: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    importPath: symbol.importPath ?? symbol.id,
    displayName: symbol.name,
    signature: symbol.signature ?? "(*args)",
    argumentNames: (symbol.arguments ?? []).map((argument) => argument.name),
    arguments: symbol.arguments ?? [],
    defaultValues: symbol.defaultValues ?? {},
    doc: symbol.doc ?? "",
    category: symbol.category ?? "CVXPY",
    module: symbol.module ?? "",
    callable: symbol.callable ?? true,
    examples: symbol.examples ?? [],
    symbol: symbol.symbol ?? null,
    uiOverrides: {
      source: symbol.source,
      ui: symbol.ui ?? null,
      symbol: symbol.symbol ?? null,
      examples: symbol.examples ?? [],
      warning: symbol.warning ?? null,
      note: symbol.note ?? null,
      arguments: symbol.arguments ?? []
    }
  };
}
