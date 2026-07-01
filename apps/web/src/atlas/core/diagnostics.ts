export type AtlasDiagnosticSeverity = "error" | "warning" | "info";
export type AtlasDiagnosticSource = "frontend" | "compiler" | "cvxpy" | "solver" | "migration";
export type AtlasDiagnosticTargetKind = "modelObject" | "workspaceNode" | "connection" | "project";

export type AtlasStructuredDiagnostic = {
  id: string;
  severity: AtlasDiagnosticSeverity;
  source: AtlasDiagnosticSource;
  targetId?: string | null;
  targetKind: AtlasDiagnosticTargetKind;
  message: string;
  suggestedFix?: string;
  relatedIds: string[];
};

export function normalizeDiagnostic(
  diagnostic: string | { level?: string; severity?: string; message?: string; sourceId?: string | null; source?: string; targetId?: string | null; targetKind?: string; suggestedFix?: string; relatedIds?: unknown[] },
  index = 0,
  fallbackSource: AtlasDiagnosticSource = "frontend"
): AtlasStructuredDiagnostic {
  if (typeof diagnostic === "string") {
    return {
      id: `diagnostic-${index}`,
      severity: diagnostic.toLowerCase().includes("error") ? "error" : "warning",
      source: fallbackSource,
      targetId: null,
      targetKind: "project",
      message: diagnostic,
      relatedIds: []
    };
  }
  const severity = diagnostic.severity ?? diagnostic.level;
  return {
    id: `diagnostic-${index}`,
    severity: severity === "error" || severity === "warning" || severity === "info" ? severity : "warning",
    source: isDiagnosticSource(diagnostic.source) ? diagnostic.source : fallbackSource,
    targetId: diagnostic.targetId ?? diagnostic.sourceId ?? null,
    targetKind: isTargetKind(diagnostic.targetKind) ? diagnostic.targetKind : "project",
    message: diagnostic.message ?? "Diagnostic returned without message.",
    suggestedFix: diagnostic.suggestedFix,
    relatedIds: Array.isArray(diagnostic.relatedIds)
      ? diagnostic.relatedIds.filter((id): id is string => typeof id === "string")
      : []
  };
}

function isDiagnosticSource(value: unknown): value is AtlasDiagnosticSource {
  return value === "frontend" || value === "compiler" || value === "cvxpy" || value === "solver" || value === "migration";
}

function isTargetKind(value: unknown): value is AtlasDiagnosticTargetKind {
  return value === "modelObject" || value === "workspaceNode" || value === "connection" || value === "project";
}
