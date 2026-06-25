import type { AtlasCard } from "../../core/types";

type AtlasModelDockProps = {
  cards: AtlasCard[];
};

export function AtlasModelDock({ cards }: AtlasModelDockProps) {
  const objectiveCount = cards.filter((card) => card.type === "objective").length;
  const constraintCount = cards.filter((card) => card.type === "constraint").length;

  return (
    <section className="atlas-model-dock" aria-label="Objectives and constraints dock">
      <div>
        <p className="atlas-eyebrow">Objectives</p>
        <p className="atlas-muted">
          {objectiveCount === 0 ? "No objective cards yet." : `${objectiveCount} objective cards`}
        </p>
      </div>
      <div>
        <p className="atlas-eyebrow">Constraints</p>
        <p className="atlas-muted">
          {constraintCount === 0 ? "No constraint cards yet." : `${constraintCount} constraint cards`}
        </p>
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
