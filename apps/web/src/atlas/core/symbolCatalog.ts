import {
  GENERATED_CVXPY_SYMBOL_CATALOG,
  symbolToAtomSpec,
  type GeneratedSymbolSpec
} from "./generatedSymbols";

export type AtlasSymbolCatalog = typeof GENERATED_CVXPY_SYMBOL_CATALOG;
export type AtlasSymbolSpec = GeneratedSymbolSpec;

const symbolsById = new Map(GENERATED_CVXPY_SYMBOL_CATALOG.symbols.map((symbol) => [symbol.id, symbol]));

export function getAllSymbols(): AtlasSymbolSpec[] {
  return GENERATED_CVXPY_SYMBOL_CATALOG.symbols;
}

export function getSymbolById(id: string): AtlasSymbolSpec | undefined {
  return symbolsById.get(id);
}

export function filterByKind(kind: string): AtlasSymbolSpec[] {
  return getAllSymbols().filter((symbol) => symbol.kind === kind);
}

export function filterByCategory(category: string): AtlasSymbolSpec[] {
  return getAllSymbols().filter((symbol) => symbol.category === category);
}

export function searchSymbols(query: string): AtlasSymbolSpec[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getAllSymbols();
  return getAllSymbols().filter((symbol) =>
    [
      symbol.id,
      symbol.name,
      symbol.kind,
      symbol.importPath ?? "",
      symbol.module ?? "",
      symbol.category ?? "",
      symbol.signature ?? "",
      symbol.doc ?? ""
    ].some((value) => value.toLowerCase().includes(normalized))
  );
}

export function atomSpecFromSymbolId(symbolId: string) {
  const symbol = getSymbolById(symbolId);
  if (!symbol) return undefined;
  return symbolToAtomSpec(symbol);
}

export function symbolCatalogMetadata() {
  return {
    cvxpyVersion: GENERATED_CVXPY_SYMBOL_CATALOG.cvxpyVersion ?? null,
    catalogGeneratedAt: GENERATED_CVXPY_SYMBOL_CATALOG.generatedAt,
    symbolCount: GENERATED_CVXPY_SYMBOL_CATALOG.symbols.length,
    schemaVersion: GENERATED_CVXPY_SYMBOL_CATALOG.schemaVersion
  };
}
