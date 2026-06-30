import type { AtlasIR } from "../core/ir";
import type { AtlasAtomSpec } from "../core/atoms";

export const DEFAULT_ATLAS_BACKEND_URL = "http://localhost:8000";

export type AtlasBackendDiagnostic = {
  level: "info" | "warning" | "error";
  message: string;
  sourceId?: string | null;
};

export type AtlasBackendResponse = {
  diagnostics?: AtlasBackendDiagnostic[];
  [key: string]: unknown;
};

export type AtlasCvxpyObjectMetadata = {
  shape?: unknown;
  sign?: string | null;
  curvature?: string | null;
  is_dcp?: boolean | null;
  is_dgp?: boolean | null;
  value?: unknown;
  diagnostics?: AtlasBackendDiagnostic[];
};

export type AtlasValidationResponse = AtlasBackendResponse & {
  metadata?: Record<string, AtlasCvxpyObjectMetadata>;
};

export function getAtlasBackendBaseUrl() {
  const envUrl = import.meta.env.VITE_ATLAS_BACKEND_URL as string | undefined;
  return (envUrl || DEFAULT_ATLAS_BACKEND_URL).replace(/\/$/, "");
}

export async function checkAtlasBackendHealth(baseUrl = getAtlasBackendBaseUrl()) {
  return requestAtlasBackend<{ status: string }>("/health", { method: "GET" }, baseUrl);
}

export async function fetchCvxpyAtoms(baseUrl = getAtlasBackendBaseUrl()) {
  return requestAtlasBackend<{ atoms: AtlasAtomSpec[] }>("/cvxpy/atoms", { method: "GET" }, baseUrl);
}

export async function validateAtlasModel(ir: AtlasIR, baseUrl = getAtlasBackendBaseUrl()) {
  return requestAtlasBackend<AtlasValidationResponse>(
    "/validate",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ir)
    },
    baseUrl
  );
}

export async function evaluateAtlasModel(ir: AtlasIR, baseUrl = getAtlasBackendBaseUrl()) {
  return postAtlasIR("/evaluate", ir, baseUrl);
}

export async function generateAtlasCode(ir: AtlasIR, baseUrl = getAtlasBackendBaseUrl()) {
  return postAtlasIR("/generate_code", ir, baseUrl);
}

export async function solveAtlasModel(ir: AtlasIR, baseUrl = getAtlasBackendBaseUrl()) {
  return postAtlasIR("/solve", ir, baseUrl);
}

async function postAtlasIR(path: string, ir: AtlasIR, baseUrl: string) {
  return requestAtlasBackend<AtlasBackendResponse>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ir)
    },
    baseUrl
  );
}

async function requestAtlasBackend<T>(path: string, init: RequestInit, baseUrl: string) {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    throw new Error(`Atlas backend ${path} failed with HTTP ${response.status}.`);
  }
  return (await response.json()) as T;
}
