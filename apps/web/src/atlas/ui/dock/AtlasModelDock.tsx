import type { AtlasCard } from "../../core/types";

type AtlasModelDockProps = {
  cards: AtlasCard[];
};

export function AtlasModelDock({ cards }: AtlasModelDockProps) {
  const objectives = cards.filter((card) => card.type === "objective");
  const constraints = cards.filter((card) => card.type === "constraint");

  return (
    <section className="atlas-model-dock" aria-label="Objectives and constraints dock">
      <div>
        <p className="atlas-eyebrow">Objectives</p>
        {objectives.length === 0 ? (
          <p className="atlas-muted">No objective cards yet.</p>
        ) : (
          <ul className="atlas-dock-list">
            {objectives.map((objective) => (
              <li key={objective.id}>
                <strong>{objective.title}</strong>
                <span>{objective.objective?.direction ?? "minimize"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="atlas-eyebrow">Constraints</p>
        {constraints.length === 0 ? (
          <p className="atlas-muted">No constraint cards yet.</p>
        ) : (
          <ul className="atlas-dock-list">
            {constraints.map((constraint) => (
              <li key={constraint.id}>
                <strong>{constraint.constraint?.name ?? constraint.title}</strong>
                <span>{constraint.constraint?.operator ?? "<="}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="atlas-dock-summary">
        <strong>Model assembly</strong>
        <span>
          {cards.length} total cards on the workbench. Objective and constraint cards remain
          visible here while the desk grows.
        </span>
      </div>
    </section>
  );
}
