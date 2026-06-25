type AtlasSolutionPanelProps = {
  statusMessage: string;
  updatedAt: string;
};

export function AtlasSolutionPanel({ statusMessage, updatedAt }: AtlasSolutionPanelProps) {
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
      <p className="atlas-muted">
        Backend validation, generated mathematics, CVXPY code, solver status, objective value,
        and decision values will appear here when those layers are implemented.
      </p>
    </section>
  );
}
