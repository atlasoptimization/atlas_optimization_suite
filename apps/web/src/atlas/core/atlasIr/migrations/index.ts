export const CURRENT_ATLAS_IR_SCHEMA_VERSION = "0.3.0" as const;

export type AtlasIrMigrationResult = {
  ir: unknown;
  diagnostics: string[];
};

export function getCurrentSchemaVersion() {
  return CURRENT_ATLAS_IR_SCHEMA_VERSION;
}

export function migrateIr(value: unknown): AtlasIrMigrationResult {
  if (!isRecord(value)) return { ir: value, diagnostics: ["Atlas IR must be a JSON object."] };
  const diagnostics: string[] = [];
  let current = copyJson(value);
  const version = typeof current.schemaVersion === "string" ? current.schemaVersion : "0.1";
  if (version === CURRENT_ATLAS_IR_SCHEMA_VERSION) return { ir: current, diagnostics };
  if (version === "0.1") {
    current = migrate_0_1_to_0_2(current);
    diagnostics.push("Migrated Atlas IR from 0.1 to 0.2-cvxpy.");
  }
  const nextVersion = typeof current.schemaVersion === "string" ? current.schemaVersion : version;
  if (nextVersion === "0.2-cvxpy" || nextVersion === "0.2" || nextVersion === "0.2.0") {
    current = migrate_0_2_to_0_3(current);
    diagnostics.push(`Migrated Atlas IR from ${nextVersion} to ${CURRENT_ATLAS_IR_SCHEMA_VERSION}.`);
  }
  if (current.schemaVersion !== CURRENT_ATLAS_IR_SCHEMA_VERSION) {
    diagnostics.push(`Unsupported Atlas IR schemaVersion "${String(current.schemaVersion)}".`);
  }
  return { ir: current, diagnostics };
}

export function migrate_0_1_to_0_2(ir: Record<string, unknown>) {
  return {
    ...ir,
    schemaVersion: "0.2-cvxpy",
    metadata: {
      ...(isRecord(ir.metadata) ? ir.metadata : {}),
      schemaVersion: "0.2-cvxpy"
    },
    modelObjects: isRecord(ir.modelObjects) ? ir.modelObjects : emptyModelObjects(),
    workspaceNodes: Array.isArray(ir.workspaceNodes) ? ir.workspaceNodes : [],
    connections: Array.isArray(ir.connections) ? ir.connections : []
  };
}

export function migrate_0_2_to_0_3(ir: Record<string, unknown>) {
  const workspaceNodes = Array.isArray(ir.workspaceNodes) ? ir.workspaceNodes : [];
  const connections = Array.isArray(ir.connections) ? ir.connections : [];
  return {
    ...ir,
    schemaVersion: CURRENT_ATLAS_IR_SCHEMA_VERSION,
    metadata: {
      ...(isRecord(ir.metadata) ? ir.metadata : {}),
      schemaVersion: CURRENT_ATLAS_IR_SCHEMA_VERSION
    },
    workspace: {
      ...(isRecord(ir.workspace) ? ir.workspace : {}),
      nodes: workspaceNodes,
      connections,
      camera: isRecord(ir.views) && isRecord(ir.views.camera) ? ir.views.camera : {},
      openPanels: isRecord(ir.views) && isRecord(ir.views.openPanels) ? ir.views.openPanels : {}
    }
  };
}

function emptyModelObjects() {
  return {
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
  };
}

function copyJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
