import {
  checkAtlasBackendHealth,
  evaluateAtlasModel,
  fetchAtlasBackendCapabilities,
  generateAtlasCode,
  solveAtlasModel,
  validateAtlasModel,
  type AtlasBackendResponse,
  type AtlasValidationResponse
} from "../api/backendClient";
import type { AtlasEvaluationMode } from "../core/evaluator";
import type { AtlasIR } from "../core/ir";
import type {
  ExecutionBackend,
  ExecutionCodeResponse,
  ExecutionHealth,
  ExecutionSolveResponse
} from "./types";

export function createLocalFastApiBackend(): ExecutionBackend {
  return {
    id: "local-fastapi",
    label: "Local FastAPI",
    description: "Use the local Python/FastAPI CVXPY backend.",
    async health(): Promise<ExecutionHealth> {
      await checkAtlasBackendHealth();
      return { status: "ok" };
    },
    async capabilities() {
      return fetchAtlasBackendCapabilities();
    },
    async validate(ir: AtlasIR) {
      return ensureObject(await validateAtlasModel(ir), "validate") as AtlasValidationResponse;
    },
    async generateCode(ir: AtlasIR) {
      const response = ensureObject(await generateAtlasCode(ir), "generate_code") as ExecutionCodeResponse;
      if (typeof response.code !== "string" && typeof response.generatedCode !== "string") {
        throw new Error("Invalid Local FastAPI generate_code response: missing code.");
      }
      return response;
    },
    async solve(ir: AtlasIR) {
      const response = ensureObject(await solveAtlasModel(ir), "solve") as ExecutionSolveResponse;
      if (typeof response.status !== "string" && !("diagnostics" in response)) {
        throw new Error("Invalid Local FastAPI solve response: missing status or diagnostics.");
      }
      return response;
    },
    async evaluate(ir: AtlasIR, mode: AtlasEvaluationMode) {
      void mode;
      return ensureObject(await evaluateAtlasModel(ir), "evaluate") as AtlasBackendResponse;
    }
  };
}

export const localFastApiBackend = createLocalFastApiBackend();

function ensureObject(response: unknown, operation: string): Record<string, unknown> {
  if (typeof response !== "object" || response === null || Array.isArray(response)) {
    throw new Error(`Invalid Local FastAPI ${operation} response: expected JSON object.`);
  }
  return response as Record<string, unknown>;
}
