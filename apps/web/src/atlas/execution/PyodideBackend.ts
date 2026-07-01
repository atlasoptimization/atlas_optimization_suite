import type { AtlasIR } from "../core/ir";
import type { ExecutionBackend } from "./types";
import { executionDiagnostic } from "./types";

export type PyodideRuntimeStatus = "not-loaded" | "loading" | "ready" | "error";

export type PyodideRuntimeState = {
  status: PyodideRuntimeStatus;
  message: string;
  supportsBrowserRuntime: boolean;
  packagesLoaded: boolean;
  solveSupported: boolean;
};

export type PyodideRuntimeLoader = () => Promise<void>;

const INITIAL_STATE: PyodideRuntimeState = {
  status: "not-loaded",
  message: "Browser/Pyodide runtime is not loaded.",
  supportsBrowserRuntime: typeof WebAssembly !== "undefined",
  packagesLoaded: false,
  solveSupported: false
};

export type PyodideExecutionBackend = ExecutionBackend & {
  getRuntimeState: () => PyodideRuntimeState;
  loadRuntime: () => Promise<PyodideRuntimeState>;
};

export function createPyodideBackend(loader: PyodideRuntimeLoader = defaultPyodideLoader): PyodideExecutionBackend {
  let state: PyodideRuntimeState = { ...INITIAL_STATE };
  let loadingPromise: Promise<PyodideRuntimeState> | null = null;

  async function loadRuntime() {
    if (state.status === "ready") return state;
    if (loadingPromise) return loadingPromise;

    if (!state.supportsBrowserRuntime) {
      state = {
        ...state,
        status: "error",
        message: "This browser environment does not expose WebAssembly."
      };
      return state;
    }

    state = {
      ...state,
      status: "loading",
      message: "Loading Browser/Pyodide runtime scaffold."
    };

    loadingPromise = loader()
      .then(() => {
        state = {
          status: "ready",
          message: "Browser/Pyodide scaffold is ready. CVXPY package loading is still pending.",
          supportsBrowserRuntime: true,
          packagesLoaded: false,
          solveSupported: false
        };
        return state;
      })
      .catch((error) => {
        state = {
          ...state,
          status: "error",
          message: error instanceof Error ? error.message : "Browser/Pyodide runtime failed to load."
        };
        return state;
      })
      .finally(() => {
        loadingPromise = null;
      });

    return loadingPromise;
  }

  function pendingResponse(ir: AtlasIR, operation: string) {
    return {
      diagnostics: [
        executionDiagnostic(
          `Browser/Pyodide ${operation} is not ready. Runtime state: ${state.status}. ${state.message}`
        ),
        executionDiagnostic(
          `Atlas IR contains ${Object.values(ir.modelObjects).reduce((count, collection) => count + collection.length, 0)} model object(s).`,
          "info"
        )
      ]
    };
  }

  return {
    id: "browser-pyodide",
    label: "Browser/Pyodide",
    description: "Future in-browser Python/CVXPY execution adapter.",
    unavailableReason: "CVXPY package loading in Pyodide is pending.",
    getRuntimeState: () => state,
    loadRuntime,
    async health() {
      return {
        status: state.supportsBrowserRuntime ? "unavailable" : "unavailable",
        message: state.message
      };
    },
    async validate(ir) {
      await loadRuntime();
      return pendingResponse(ir, "validation");
    },
    async generateCode(ir) {
      await loadRuntime();
      return {
        ...pendingResponse(ir, "code generation"),
        code: "# Browser/Pyodide CVXPY code generation is pending."
      };
    },
    async solve(ir) {
      await loadRuntime();
      return {
        ...pendingResponse(ir, "solve"),
        status: "not_available",
        solverName: "browser-pyodide"
      };
    },
    async evaluate(ir) {
      await loadRuntime();
      return pendingResponse(ir, "evaluation");
    }
  };
}

async function defaultPyodideLoader() {
  return Promise.resolve();
}

export const pyodideBackend = createPyodideBackend();
