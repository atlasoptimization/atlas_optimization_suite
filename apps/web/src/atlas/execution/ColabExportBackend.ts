import type { AtlasIR } from "../core/ir";
import { generateColabNotebook } from "./colabNotebook";
import type { ExecutionBackend, ExecutionCodeResponse } from "./types";
import { executionDiagnostic } from "./types";

export const colabExportBackend: ExecutionBackend = {
  id: "colab-export",
  label: "Colab Export",
  description: "Generate a Colab-ready CVXPY notebook from the current Atlas IR.",
  async health() {
    return { status: "ok", message: "Colab Export is available as a notebook/script generator." };
  },
  async validate(ir) {
    return {
      diagnostics: [
        executionDiagnostic(
          `Colab Export can generate a notebook for ${countModelObjects(ir)} model object(s).`,
          "info"
        )
      ],
      metadata: {}
    };
  },
  async generateCode(ir): Promise<ExecutionCodeResponse> {
    const result = generateColabNotebook(ir);
    return {
      code: result.code,
      diagnostics: [
        ...result.diagnostics,
        executionDiagnostic(`Generated Colab notebook code for ${result.filename}.`, "info")
      ]
    };
  },
  async solve(ir) {
    const result = generateColabNotebook(ir);
    return {
      status: "not_available",
      generatedCode: result.code,
      solverName: "colab-export",
      diagnostics: [
        ...result.diagnostics,
        executionDiagnostic("Colab Export does not solve inside the GUI. Export and run in Colab.")
      ]
    };
  },
  async evaluate(ir) {
    return {
      diagnostics: [
        executionDiagnostic(
          `Colab Export does not evaluate inside the GUI. Export ${generateColabNotebook(ir).filename} and run it in Colab.`
        )
      ]
    };
  },
  async exportNotebook(ir: AtlasIR) {
    const result = generateColabNotebook(ir);
    return {
      filename: result.filename,
      content: JSON.stringify(result.notebook, null, 2),
      mimeType: "application/x-ipynb+json"
    };
  }
};

function countModelObjects(ir: AtlasIR) {
  return Object.values(ir.modelObjects).reduce((count, collection) => count + collection.length, 0);
}
