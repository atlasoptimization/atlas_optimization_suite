import type { AtlasTutorialStep } from "../../core/tutorial";

type AtlasTutorialPanelProps = {
  open: boolean;
  step: AtlasTutorialStep | null;
  stepIndex: number;
  stepCount: number;
  onNext: () => void;
  onBack: () => void;
  onReset: () => void;
  onExit: () => void;
};

export function AtlasTutorialPanel({
  open,
  step,
  stepIndex,
  stepCount,
  onNext,
  onBack,
  onReset,
  onExit
}: AtlasTutorialPanelProps) {
  if (!open || !step) return null;
  return (
    <aside className="atlas-tutorial-panel" aria-label="Atlas tutorial">
      <header>
        <p className="atlas-eyebrow">Tutorial</p>
        <h2>{step.title}</h2>
        <span>
          Step {stepIndex + 1} of {stepCount}
        </span>
      </header>
      <p>{step.text}</p>
      <footer>
        <button type="button" onClick={onBack} disabled={stepIndex === 0}>
          Back
        </button>
        <button type="button" onClick={onNext} disabled={stepIndex >= stepCount - 1}>
          Next
        </button>
        <button type="button" onClick={onReset}>
          Reset tutorial
        </button>
        <button type="button" onClick={onExit}>
          Exit
        </button>
      </footer>
    </aside>
  );
}
