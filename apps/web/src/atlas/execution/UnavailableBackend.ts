import type { AtlasIR } from "../core/ir";
import type { ExecutionBackend, ExecutionBackendId } from "./types";
import { executionDiagnostic } from "./types";

export function createUnavailableBackend(
  id: Exclude<ExecutionBackendId, "mock" | "local-fastapi">,
  label: string,
  description: string,
  unavailableReason: string
): ExecutionBackend {
  async function unavailable(operation: string) {
    return {
      diagnostics: [executionDiagnostic(`${label} ${operation} is not implemented yet. ${unavailableReason}`)]
    };
  }

  return {
    id,
    label,
    description,
    unavailableReason,
    async health() {
      return { status: "unavailable", message: unavailableReason };
    },
    validate: (ir: AtlasIR) => {
      void ir;
      return unavailable("validation");
    },
    generateCode: (ir: AtlasIR) => {
      void ir;
      return unavailable("code generation");
    },
    solve: (ir: AtlasIR) => {
      void ir;
      return unavailable("solve");
    },
    evaluate: (ir: AtlasIR) => {
      void ir;
      return unavailable("evaluation");
    }
  };
}
