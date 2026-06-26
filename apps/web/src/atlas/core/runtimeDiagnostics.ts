export type AtlasRuntimeDiagnosticStatus = "ok" | "warning" | "error" | "stale";
export type AtlasRuntimeDiagnosticSource = "evaluate" | "solve" | "validate" | "manual";

export type AtlasRuntimeDiagnostic = {
  cardId: string;
  diagnosticId: string;
  label: string;
  value: string;
  unit?: string;
  status: AtlasRuntimeDiagnosticStatus;
  source: AtlasRuntimeDiagnosticSource;
  timestamp?: string;
};

export function upsertRuntimeDiagnostics(
  diagnostics: AtlasRuntimeDiagnostic[],
  updates: AtlasRuntimeDiagnostic[]
) {
  const byKey = new Map(diagnostics.map((diagnostic) => [diagnosticKey(diagnostic), diagnostic]));
  for (const update of updates) byKey.set(diagnosticKey(update), update);
  return [...byKey.values()];
}

export function clearRuntimeDiagnosticsBySource(
  diagnostics: AtlasRuntimeDiagnostic[],
  source: AtlasRuntimeDiagnosticSource
) {
  return diagnostics.filter((diagnostic) => diagnostic.source !== source);
}

export function markSolveDiagnosticsStale(diagnostics: AtlasRuntimeDiagnostic[]) {
  return diagnostics.map((diagnostic) =>
    diagnostic.source === "solve" ? { ...diagnostic, status: "stale" as const } : diagnostic
  );
}

export function diagnosticKey(diagnostic: Pick<AtlasRuntimeDiagnostic, "cardId" | "diagnosticId">) {
  return `${diagnostic.cardId}:${diagnostic.diagnosticId}`;
}
