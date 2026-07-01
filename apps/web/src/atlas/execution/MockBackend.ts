import type { AtlasIR } from "../core/ir";
import type {
  ExecutionBackend,
  ExecutionCodeResponse,
  ExecutionSolveResponse
} from "./types";
import { executionDiagnostic } from "./types";

export const mockBackend: ExecutionBackend = {
  id: "mock",
  label: "Mock",
  description: "Deterministic UI-development backend; no Python runtime required.",
  async health() {
    return { status: "ok" };
  },
  async capabilities() {
    return {
      backendId: "mock",
      backendLabel: "Mock",
      cvxpyAvailable: false,
      cvxpyVersion: null,
      availableSolvers: [],
      supportsValidate: true,
      supportsGenerateCode: true,
      supportsSolve: true,
      supportsEvaluate: true,
      supportsMilp: false,
      supportsSymbolCatalog: true,
      symbolCatalogVersion: "0.1",
      symbolCatalogHash: null,
      warnings: ["Mock mode returns deterministic UI-development results."]
    };
  },
  async validate(ir) {
    return {
      diagnostics: [
        executionDiagnostic(`Mock validation passed for ${countModelObjects(ir)} model object(s).`, "info")
      ],
      metadata: {}
    };
  },
  async generateCode(ir): Promise<ExecutionCodeResponse> {
    const variableNames = ir.modelObjects.variables.map((variable) => variable.name).join(", ") || "no variables";
    return {
      diagnostics: [executionDiagnostic("Mock backend generated placeholder CVXPY code.", "info")],
      code: [
        "# Mock backend generated code",
        "import cvxpy as cp",
        `# Variables: ${variableNames}`,
        "objective = cp.Minimize(0)",
        "problem = cp.Problem(objective, [])",
        "problem.solve()"
      ].join("\n")
    };
  },
  async solve(ir): Promise<ExecutionSolveResponse> {
    const variableValues = mockVariableValues(ir);
    return {
      status: "mock-optimal",
      objectiveValue: inferMockObjectiveValue(variableValues),
      variableValues,
      variables: Object.entries(variableValues).map(([id, value]) => ({
        id,
        name: variableName(ir, id),
        value
      })),
      constraints: {},
      generatedCode: "# Mock solve result; no CVXPY runtime was executed.",
      solverName: "mock",
      diagnostics: [executionDiagnostic("Mock mode is active; this solution is deterministic UI data.", "info")]
    };
  },
  async evaluate() {
    return {
      diagnostics: [executionDiagnostic("Mock evaluation completed with placeholder values.", "info")],
      functions: {},
      objectives: {},
      constraints: {}
    };
  }
};

function countModelObjects(ir: AtlasIR) {
  return Object.values(ir.modelObjects).reduce((count, collection) => count + collection.length, 0);
}

function mockVariableValues(ir: AtlasIR) {
  const values: Record<string, unknown> = {};
  for (const variable of ir.modelObjects.variables) {
    if (String(variable.name).toLowerCase() === "x" && isVectorShape(variable.shape)) {
      values[variable.id] = [1.1667, 0.5];
    } else if (String(variable.name).toLowerCase() === "x") {
      values[variable.id] = 2;
    } else if (String(variable.name).toLowerCase() === "y") {
      values[variable.id] = 2;
    } else {
      values[variable.id] = 1;
    }
  }
  return values;
}

function isVectorShape(shape: unknown) {
  return shape === "vector" || (Array.isArray(shape) && shape.length === 1 && Number(shape[0]) > 1);
}

function inferMockObjectiveValue(values: Record<string, unknown>) {
  if ("var-x" in values && "var-y" in values) return 10;
  return Object.values(values).reduce<number>((total, value) => total + numericMockValue(value), 0);
}

function numericMockValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    return value.reduce<number>((total, item) => total + numericMockValue(item), 0);
  }
  return 0;
}

function variableName(ir: AtlasIR, id: string) {
  return ir.modelObjects.variables.find((variable) => variable.id === id)?.name ?? id;
}
