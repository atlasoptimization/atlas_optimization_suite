import { useMemo, useState } from "react";
import type { GameMode } from "../../core/types/mode";
import { DEFAULT_MODE_ID } from "../../modes/constants";
import { ModeList } from "../modes/ModeList";

export type NewSessionWizardResult = {
  title: string;
  question: string;
  context: string;
  modeId: string;
  shufflePiles: boolean;
  startWithDomainMasters: boolean;
  disableStartupWizard: boolean;
};

type NewSessionWizardProps = {
  modes: GameMode[];
  initialTitle?: string;
  initialQuestion?: string;
  initialContext?: string;
  initialModeId?: string;
  onStart: (result: NewSessionWizardResult) => void;
  onCancel: () => void;
};

const steps = ["Problem", "Mode", "Setup", "Start"] as const;

export function NewSessionWizard({
  modes,
  initialTitle = "",
  initialQuestion = "",
  initialContext = "",
  initialModeId = DEFAULT_MODE_ID,
  onStart,
  onCancel
}: NewSessionWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState(initialTitle || "Untitled session");
  const [question, setQuestion] = useState(initialQuestion);
  const [context, setContext] = useState(initialContext);
  const [modeId, setModeId] = useState(initialModeId || DEFAULT_MODE_ID);
  const [shufflePiles, setShufflePiles] = useState(true);
  const [startWithDomainMasters, setStartWithDomainMasters] = useState(false);
  const [disableStartupWizard, setDisableStartupWizard] = useState(false);
  const activeMode = useMemo(
    () => modes.find((mode) => mode.id === modeId) ?? modes.find((mode) => mode.id === DEFAULT_MODE_ID) ?? modes[0],
    [modeId, modes]
  );

  function startSession() {
    onStart({
      title: title.trim() || "Untitled session",
      question,
      context,
      modeId: modeId || DEFAULT_MODE_ID,
      shufflePiles,
      startWithDomainMasters,
      disableStartupWizard
    });
  }

  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true">
      <section className="new-session-wizard" data-testid="new-session-wizard">
        <header className="wizard-header">
          <div>
            <h2>New Session</h2>
            <p>The deck is a compact tool for structured thinking. Use it to examine models, assumptions, uncertainty, omissions, and decisions.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Close wizard">
            Close
          </button>
        </header>

        <nav className="wizard-steps" aria-label="Wizard steps">
          {steps.map((step, index) => (
            <button
              key={step}
              type="button"
              className={index === stepIndex ? "active" : ""}
              onClick={() => setStepIndex(index)}
            >
              {index + 1}. {step}
            </button>
          ))}
        </nav>

        <div className="wizard-body">
          {stepIndex === 0 && (
            <section className="wizard-step-panel">
              <h3>Problem</h3>
              <label>
                Session title
                <input value={title} onChange={(event) => setTitle(event.target.value)} />
              </label>
              <label>
                Modelling question
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="What are we trying to understand, decide, or model?"
                />
              </label>
              <label>
                Context notes
                <textarea
                  value={context}
                  onChange={(event) => setContext(event.target.value)}
                  placeholder="Relevant background, assumptions, constraints, data, or doubts."
                />
              </label>
              <p className="muted">
                You can add or edit more session details later under the Session menu.
              </p>
            </section>
          )}

          {stepIndex === 1 && (
            <section className="wizard-step-panel">
              <h3>Mode</h3>
              <ModeList
                modes={modes}
                activeModeId={modeId}
                onSelectMode={setModeId}
              />

              {activeMode && (
                <div className="wizard-mode-detail">
                  <h4>{activeMode.name}</h4>
                  <p><strong>Purpose:</strong> {activeMode.purpose}</p>
                  {activeMode.whenToUse && <p><strong>Use when:</strong> {activeMode.whenToUse}</p>}
                  {activeMode.procedureSummary && (
                    <p><strong>Procedure:</strong> {activeMode.procedureSummary}</p>
                  )}
                  <div className="wizard-domain-vector">
                    {Object.entries(activeMode.domainVector).map(([domain, value]) => (
                      <span key={domain}>
                        {domain}: <strong>{value}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {stepIndex === 2 && (
            <section className="wizard-step-panel">
              <h3>Setup</h3>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={shufflePiles}
                  onChange={(event) => setShufflePiles(event.target.checked)}
                />
                Shuffle domain piles
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={startWithDomainMasters}
                  onChange={(event) => setStartWithDomainMasters(event.target.checked)}
                />
                Start with the six domain master cards
              </label>
              <p className="muted">
                Manual/free use remains available in every mode unless stricter enforcement is added later.
              </p>
            </section>
          )}

          {stepIndex === 3 && (
            <section className="wizard-step-panel">
              <h3>Start</h3>
              <dl className="wizard-summary">
                <div>
                  <dt>Title</dt>
                  <dd>{title.trim() || "Untitled session"}</dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>{activeMode?.name ?? "Standard"}</dd>
                </div>
                <div>
                  <dt>Question</dt>
                  <dd>{question.trim() || "No question recorded yet."}</dd>
                </div>
                <div>
                  <dt>Setup</dt>
                  <dd>
                    {shufflePiles ? "Shuffle piles" : "Keep pile order"}
                    {startWithDomainMasters ? " · place domain masters" : " · empty board"}
                  </dd>
                </div>
              </dl>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={disableStartupWizard}
                  onChange={(event) => setDisableStartupWizard(event.target.checked)}
                />
                Do not show this wizard automatically on startup
              </label>
            </section>
          )}
        </div>

        <footer className="wizard-footer">
          <button
            type="button"
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            disabled={stepIndex === 0}
          >
            Back
          </button>
          {stepIndex < steps.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.min(steps.length - 1, current + 1))}
            >
              Next
            </button>
          ) : (
            <button type="button" onClick={startSession}>
              Start session
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}
