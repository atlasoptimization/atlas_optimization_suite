import type {
  AtlasBackendDiagnostic,
  AtlasBackendResponse,
  AtlasBackendCapabilities,
  AtlasValidationResponse
} from "../api/backendClient";
import type { AtlasEvaluationMode } from "../core/evaluator";
import type { AtlasIR } from "../core/ir";

export type ExecutionBackendId =
  | "mock"
  | "local-fastapi"
  | "browser-pyodide"
  | "colab-export"
  | "hosted-api";

export type ExecutionHealth = {
  status: "ok" | "unavailable";
  message?: string;
};

export type ExecutionCodeResponse = AtlasBackendResponse & {
  code?: string;
  generatedCode?: string;
};

export type ExecutionNotebook = {
  filename: string;
  content: string;
  mimeType: "application/x-ipynb+json";
};

export type ExecutionSolveResponse = AtlasBackendResponse & {
  status?: string;
  objectiveValue?: unknown;
  variableValues?: Record<string, unknown>;
  variables?: unknown[];
  constraints?: unknown;
  generatedCode?: string;
  code?: string;
  solverName?: string;
};

export interface ExecutionBackend {
  id: ExecutionBackendId;
  label: string;
  description: string;
  unavailableReason?: string;
  health?: () => Promise<ExecutionHealth>;
  capabilities?: () => Promise<AtlasBackendCapabilities>;
  validate: (ir: AtlasIR) => Promise<AtlasValidationResponse>;
  generateCode: (ir: AtlasIR) => Promise<ExecutionCodeResponse>;
  solve: (ir: AtlasIR) => Promise<ExecutionSolveResponse>;
  evaluate: (ir: AtlasIR, mode: AtlasEvaluationMode) => Promise<AtlasBackendResponse>;
  exportNotebook?: (ir: AtlasIR) => Promise<ExecutionNotebook>;
}

export function executionDiagnostic(
  message: string,
  level: AtlasBackendDiagnostic["level"] = "warning"
): AtlasBackendDiagnostic {
  return { level, message, sourceId: null };
}
