import type { ReactNode } from "react";
import type { AtlasSolutionState } from "../../core/solution";

type AtlasSolutionPanelProps = {
  statusMessage: string;
  updatedAt: string;
  backendStatus: "unknown" | "connected" | "unavailable";
  backendDiagnostics: string[];
  solution: AtlasSolutionState;
  onSelectVariable?: (variableId: string) => void;
  onSelectConstraint?: (constraintId: string) => void;
};

export function AtlasSolutionPanel({
  statusMessage,
  updatedAt,
  backendStatus,
  backendDiagnostics,
  solution,
  onSelectVariable,
  onSelectConstraint
}: AtlasSolutionPanelProps) {
  const result =
    solution.status === "success"
      ? solution.result
      : solution.status === "loading" || solution.status === "error"
        ? solution.previous
        : null;

  return (
    <section className="atlas-panel atlas-solution-panel" aria-label="Solution panel">
      <header>
        <p className="atlas-eyebrow">Solution</p>
        <h2>Evaluation and solve results</h2>
      </header>

      <div className="atlas-status-box" role="status" aria-live="polite">
        <span>{updatedAt}</span>
        <p>{statusMessage}</p>
      </div>

      {solution.status === "empty" && (
        <div className="atlas-solution-empty">
          <strong>No solve results yet.</strong>
          <p>Click Solve to send the current Atlas IR to the backend and keep results here.</p>
        </div>
      )}

      {solution.status === "loading" && (
        <div className="atlas-solution-state">
          <strong>Solving...</strong>
          <p>The previous solution remains visible while the backend runs.</p>
        </div>
      )}

      {solution.status === "error" && (
        <div className="atlas-solution-state atlas-solution-error">
          <strong>Solve failed.</strong>
          <p>{solution.message}</p>
        </div>
      )}

      {(solution.status === "success" || result) && (
        <div className="atlas-solution-results">
          {solution.status === "success" && solution.stale && (
            <p className="atlas-stale-warning">Solution is stale because the model changed after solving.</p>
          )}
          {solution.status !== "success" && "stale" in solution && solution.stale && (
            <p className="atlas-stale-warning">Previous solution is stale.</p>
          )}
          {result && (
            <>
              <div className="atlas-solution-metric">
                <span>Solver status</span>
                <strong>{result.status}</strong>
              </div>
              <div className="atlas-solution-metric">
                <span>Objective value</span>
                <strong>{formatValue(result.objectiveValue)}</strong>
              </div>

              <ResultSection title="Decision values">
                {Object.keys(result.variableValues).length === 0 ? (
                  <p className="atlas-muted">No decision values returned.</p>
                ) : (
                  <ul className="atlas-result-list">
                    {Object.entries(result.variableValues).map(([variableId, value]) => (
                      <li key={variableId}>
                        <button type="button" onClick={() => onSelectVariable?.(variableId)}>
                          <span>{variableId}</span>
                          <strong>{formatValue(value)}</strong>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ResultSection>

              <ResultSection title="Constraint results">
                {!result.constraints || Object.keys(result.constraints).length === 0 ? (
                  <p className="atlas-muted">No constraint values returned.</p>
                ) : (
                  <ul className="atlas-result-list">
                    {Object.entries(result.constraints).map(([constraintId, constraint]) => (
                      <li key={constraintId}>
                        <button type="button" onClick={() => onSelectConstraint?.(constraintId)}>
                          <span>{constraintId}</span>
                          <strong>
                            left {formatValue(constraint.left)} / right {formatValue(constraint.right)}
                          </strong>
                          <em>
                            residual {formatValue(constraint.residual)}
                            {constraint.satisfied === null || constraint.satisfied === undefined
                              ? ""
                              : constraint.satisfied
                                ? " satisfied"
                                : " violated"}
                          </em>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </ResultSection>

              <ResultSection title="Solver diagnostics">
                {[...result.diagnostics, ...backendDiagnostics.map((message) => ({ message }))].length === 0 ? (
                  <p className="atlas-muted">No diagnostics returned.</p>
                ) : (
                  <ul className="atlas-diagnostic-list">
                    {[...result.diagnostics, ...backendDiagnostics.map((message) => ({ message }))].map(
                      (diagnostic, index) => (
                        <li key={`${diagnostic.message}-${index}`}>{diagnostic.message}</li>
                      )
                    )}
                  </ul>
                )}
              </ResultSection>

              {result.code && (
                <details className="atlas-code-details">
                  <summary>Generated CVXPY code</summary>
                  <pre className="atlas-expression-json" aria-label="Generated CVXPY code">
                    {result.code}
                  </pre>
                </details>
              )}
            </>
          )}
        </div>
      )}

      <div className="atlas-status-box">
        <span>Backend {backendStatus}</span>
        <p>Backend validation and solving are optional during local editing.</p>
      </div>
    </section>
  );
}

function ResultSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="atlas-result-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function formatValue(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return value.toLocaleString();
  if (Array.isArray(value)) return `[${value.map(formatValue).join(", ")}]`;
  return value === null || value === undefined ? "n/a" : String(value);
}
