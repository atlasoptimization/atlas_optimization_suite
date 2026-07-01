export type AtlasAtomSpec = {
  symbolId?: string;
  name: string;
  kind?: string;
  importPath: string;
  displayName?: string | null;
  signature: string;
  argumentNames: string[];
  arguments?: AtlasAtomArgumentSpec[];
  defaultValues: Record<string, string>;
  doc: string;
  category: string;
  module: string;
  callable: boolean;
  examples?: string[];
  symbol?: string | null;
  uiOverrides?: Record<string, unknown> | null;
};

export type AtlasAtomArgumentSpec = {
  name: string;
  kind?: string;
  default?: unknown;
  ui?: Record<string, unknown> | null;
};

export const FALLBACK_ATOM_SPECS: AtlasAtomSpec[] = [
  atom("sum", "cvxpy.sum", "(expr, axis=None, keepdims=False)", ["expr", "axis", "keepdims"], {
    axis: "None",
    keepdims: "False"
  }),
  atom("norm", "cvxpy.norm", "(x, p=2, axis=None)", ["x", "p", "axis"], {
    p: "2",
    axis: "None"
  }),
  atom("sum_squares", "cvxpy.sum_squares", "(expr)", ["expr"]),
  atom("square", "cvxpy.square", "(x)", ["x"]),
  atom("abs", "cvxpy.abs", "(x)", ["x"]),
  atom("maximum", "cvxpy.maximum", "(*args)", ["args"]),
  atom("minimum", "cvxpy.minimum", "(*args)", ["args"]),
  atom("pos", "cvxpy.pos", "(x)", ["x"]),
  atom("neg", "cvxpy.neg", "(x)", ["x"]),
  atom("quad_form", "cvxpy.quad_form", "(x, P)", ["x", "P"])
];

export function filterAtomSpecs(atoms: AtlasAtomSpec[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return atoms;
  return atoms.filter((atomSpec) =>
    [
      atomSpec.name,
      atomSpec.importPath,
      atomSpec.signature,
      atomSpec.category,
      atomSpec.module,
      atomSpec.doc
    ].some((value) => value.toLowerCase().includes(normalized))
  );
}

function atom(
  name: string,
  importPath: string,
  signature: string,
  argumentNames: string[],
  defaultValues: Record<string, string> = {}
): AtlasAtomSpec {
  return {
    name,
    importPath,
    signature,
    argumentNames,
    defaultValues,
    doc: "Fallback CVXPY atom metadata. Start the backend for discovered signatures and docs.",
    category: "fallback",
    module: "cvxpy",
    callable: false
  };
}
