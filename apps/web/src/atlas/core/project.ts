import { exportAtlasIR, importAtlasIR, serializeAtlasIR, type AtlasIR } from "./ir";
import type { AtlasWorkbenchState } from "./types";

export const ATLAS_PROJECT_SCHEMA_VERSION = "0.1";

export type AtlasProjectFile = {
  projectSchemaVersion: typeof ATLAS_PROJECT_SCHEMA_VERSION;
  kind: "atlas-project";
  name: string;
  savedAt: string;
  ir: AtlasIR;
};

export function createAtlasProjectFile(
  state: AtlasWorkbenchState,
  name = "Atlas project"
): AtlasProjectFile {
  return {
    projectSchemaVersion: ATLAS_PROJECT_SCHEMA_VERSION,
    kind: "atlas-project",
    name,
    savedAt: new Date().toISOString(),
    ir: exportAtlasIR(state)
  };
}

export function serializeAtlasProject(project: AtlasProjectFile) {
  return JSON.stringify(project, null, 2);
}

export function importAtlasProject(value: unknown) {
  if (isRecord(value) && value.kind === "atlas-project" && "ir" in value) {
    return importAtlasIR(value.ir);
  }
  return importAtlasIR(value);
}

export function serializeAtlasProjectState(state: AtlasWorkbenchState, name?: string) {
  return serializeAtlasProject(createAtlasProjectFile(state, name));
}

export function serializeAtlasProjectIR(state: AtlasWorkbenchState) {
  return serializeAtlasIR(exportAtlasIR(state));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
