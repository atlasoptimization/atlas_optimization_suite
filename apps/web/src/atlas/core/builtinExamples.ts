import { ATLAS_IR_SCHEMA_VERSION, importAtlasIR, type AtlasIR } from "./ir";
import type { AtlasWorkbenchState } from "./types";

export type AtlasBuiltinExampleId = "tiny-lp" | "least-squares" | "ridge-regression";

export type AtlasBuiltinExample = {
  id: AtlasBuiltinExampleId;
  title: string;
  description: string;
  expected: string;
  ir: AtlasIR;
};

export const ATLAS_BUILTIN_EXAMPLES: AtlasBuiltinExample[] = [
  {
    id: "tiny-lp",
    title: "Tiny linear program",
    description: "Maximize 3x + 2y subject to simple capacity bounds.",
    expected: "x = 2, y = 2, objective = 10",
    ir: tinyLpIr()
  },
  {
    id: "least-squares",
    title: "Showcase: Least Squares",
    description: "Minimize ||A x - b||_2^2 for a three-row design matrix.",
    expected: "x approximately [1.1667, 0.5]",
    ir: leastSquaresIr(false)
  },
  {
    id: "ridge-regression",
    title: "Ridge regression",
    description: "Least squares with lambda ||x||_2^2 regularization.",
    expected: "x approximately [0.8, 0.6]",
    ir: leastSquaresIr(true)
  }
];

export function loadAtlasBuiltinExample(id: AtlasBuiltinExampleId): AtlasWorkbenchState {
  const example = ATLAS_BUILTIN_EXAMPLES.find((candidate) => candidate.id === id);
  if (!example) throw new Error(`Unknown Atlas example ${id}.`);
  const result = importAtlasIR(example.ir);
  if (result.diagnostics.length > 0) {
    throw new Error(result.diagnostics.join(" "));
  }
  return result.state;
}

function baseIr(title: string): AtlasIR {
  return {
    schemaVersion: ATLAS_IR_SCHEMA_VERSION,
    metadata: {
      schemaVersion: ATLAS_IR_SCHEMA_VERSION,
      source: "atlas-gui",
      title,
      exportedAt: "2026-01-01T00:00:00.000Z"
    },
    modelObjects: {
      variables: [],
      parameters: [],
      constants: [],
      atoms: [],
      expressions: [],
      constraints: [],
      objectives: [],
      problems: [],
      solvers: [],
      results: [],
      workspaceReferences: []
    },
    workspaceNodes: [],
    connections: [],
    views: { groups: [] },
    future: {},
    cards: [],
    queries: [],
    groups: []
  };
}

function tinyLpIr(): AtlasIR {
  const ir = baseIr("Tiny linear program");
  ir.modelObjects.variables.push(variable("var-x", "x"), variable("var-y", "y"));
  for (const [id, value] of [["const-3", 3], ["const-2", 2], ["const-4", 4], ["const-3-bound", 3], ["const-0", 0]] as const) {
    ir.modelObjects.constants.push({ id, kind: "constant", name: String(value), value });
  }
  ir.modelObjects.atoms.push(
    atom("atom-3x", "multiply", "atlas.expression.multiply", [ref("var-x"), ref("const-3")]),
    atom("atom-2y", "multiply", "atlas.expression.multiply", [ref("var-y"), ref("const-2")]),
    atom("atom-objective", "add", "atlas.expression.add", [ref("atom-3x"), ref("atom-2y")]),
    atom("atom-x-plus-y", "add", "atlas.expression.add", [ref("var-x"), ref("var-y")])
  );
  ir.modelObjects.objectives.push({ id: "objective", kind: "objective", name: "Maximize 3x + 2y", objective: { direction: "maximize", terms: [] } });
  ir.modelObjects.constraints.push(
    constraint("constraint-sum", "x + y <= 4", "<="),
    constraint("constraint-x-upper", "x <= 2", "<="),
    constraint("constraint-y-upper", "y <= 3", "<="),
    constraint("constraint-x-lower", "x >= 0", ">="),
    constraint("constraint-y-lower", "y >= 0", ">=")
  );
  ir.modelObjects.problems.push({ id: "problem", kind: "problem", name: "Tiny LP problem", objectiveIds: ["objective"], constraintIds: ir.modelObjects.constraints.map((item) => item.id) });
  ir.connections.push(
    conn("objective-term", "atom-objective", "objective", "term0"),
    conn("problem-objective", "objective", "problem", "objective"),
    conn("c-sum-l", "atom-x-plus-y", "constraint-sum", "lhs"),
    conn("c-sum-r", "const-4", "constraint-sum", "rhs"),
    conn("c-xu-l", "var-x", "constraint-x-upper", "lhs"),
    conn("c-xu-r", "const-2", "constraint-x-upper", "rhs"),
    conn("c-yu-l", "var-y", "constraint-y-upper", "lhs"),
    conn("c-yu-r", "const-3-bound", "constraint-y-upper", "rhs"),
    conn("c-xl-l", "var-x", "constraint-x-lower", "lhs"),
    conn("c-xl-r", "const-0", "constraint-x-lower", "rhs"),
    conn("c-yl-l", "var-y", "constraint-y-lower", "lhs"),
    conn("c-yl-r", "const-0", "constraint-y-lower", "rhs"),
    ...ir.modelObjects.constraints.map((item) => conn(`problem-${item.id}`, item.id, "problem", "constraints"))
  );
  layout(ir);
  return ir;
}

function leastSquaresIr(ridge: boolean): AtlasIR {
  const ir = baseIr(ridge ? "Ridge regression" : "Least squares");
  ir.modelObjects.variables.push({ ...variable("var-x", "x"), shape: [2] });
  ir.modelObjects.constants.push(
    { id: "const-A", kind: "constant", name: "A", value: [[1, 0], [1, 1], [1, 2]] },
    { id: "const-b", kind: "constant", name: "b", value: [1, 2, 2] },
    { id: "const-lambda", kind: "constant", name: "lambda", value: 1 }
  );
  ir.modelObjects.atoms.push(
    atom("atom-Ax", "A @ x", "atlas.expression.matmul", [ref("const-A"), ref("var-x")]),
    atom("atom-residual", "A @ x - b", "atlas.expression.subtract", [ref("atom-Ax"), ref("const-b")]),
    atom("atom-loss", "sum_squares", "cvxpy.sum_squares", [ref("atom-residual")])
  );
  let objectiveSource = "atom-loss";
  if (ridge) {
    ir.modelObjects.atoms.push(
      atom("atom-penalty", "sum_squares(x)", "cvxpy.sum_squares", [ref("var-x")]),
      atom("atom-scaled-penalty", "lambda penalty", "atlas.expression.multiply", [ref("const-lambda"), ref("atom-penalty")]),
      atom("atom-ridge-objective", "loss + penalty", "atlas.expression.add", [ref("atom-loss"), ref("atom-scaled-penalty")])
    );
    objectiveSource = "atom-ridge-objective";
  }
  ir.modelObjects.objectives.push({ id: "objective", kind: "objective", name: ridge ? "Minimize ridge objective" : "Minimize squared residuals", objective: { direction: "minimize", terms: [] } });
  ir.modelObjects.problems.push({ id: "problem", kind: "problem", name: ridge ? "Ridge problem" : "Least squares problem", objectiveIds: ["objective"], constraintIds: [] });
  ir.connections.push(conn("objective-term", objectiveSource, "objective", "term0"), conn("problem-objective", "objective", "problem", "objective"));
  layout(ir);
  return ir;
}

function variable(id: string, name: string) {
  return { id, kind: "variable" as const, name };
}

function atom(id: string, name: string, importPath: string, positionalInputs: Array<ReturnType<typeof ref>>) {
  return { id, kind: "atom" as const, name, atomName: name, importPath, displayName: name, positionalInputs, keywordInputs: {}, outputName: "expression" };
}

function ref(objectId: string) {
  return { id: `input-${objectId}`, name: objectId, kind: "reference" as const, objectId };
}

function constraint(id: string, name: string, operator: "<=" | ">=" | "==" | "=") {
  return {
    id,
    kind: "constraint" as const,
    name,
    constraint: {
      name,
      operator,
      left: { kind: "constant" as const, value: 0 },
      right: { kind: "constant" as const, value: 0 }
    }
  };
}

function conn(id: string, source: string, target: string, slot: string) {
  return { id, source: { objectId: source, port: "expression" }, target: { objectId: target, slot }, semanticReference: { kind: "expression_input", objectId: source } };
}

function layout(ir: AtlasIR) {
  const objects = [
    ...ir.modelObjects.variables,
    ...ir.modelObjects.constants,
    ...ir.modelObjects.atoms,
    ...ir.modelObjects.constraints,
    ...ir.modelObjects.objectives,
    ...ir.modelObjects.problems
  ];
  ir.workspaceNodes = objects.map((object, index) => ({
    id: `node-${object.id}`,
    modelObjectId: object.id,
    modelObjectKind: object.kind,
    position: { x: 320 + (index % 4) * 270, y: 220 + Math.floor(index / 4) * 190 },
    displayState: { title: object.name, workspaceRole: "definition" }
  }));
}
