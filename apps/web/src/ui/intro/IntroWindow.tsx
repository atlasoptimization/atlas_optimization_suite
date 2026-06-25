import { useState } from "react";
import { resolveManualPdfUrl } from "../../assets/manualAsset";
import {
  introHowItWorksBullets,
  introHowToStartText,
  introLead,
  introManualText,
  introModesText,
  introNoPointsText,
  introOutcomeText,
  introPurposeBullets,
  introShortText,
  introStandardText,
  introTitle,
  setStartupIntroHidden
} from "../../content/intro";

type IntroWindowProps = {
  onContinue: () => void;
  onOpenHelp: () => void;
  onSelectMode: (modeId: string) => void;
  onStartExample: (scriptId: string) => void;
  handbookPath?: string | null;
};

export function IntroWindow({
  onContinue,
  onOpenHelp,
  onSelectMode,
  onStartExample,
  handbookPath
}: IntroWindowProps) {
  const [hideOnStartup, setHideOnStartup] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState("standard");
  const manualUrl = resolveManualPdfUrl(handbookPath);

  function updateHideOnStartup(checked: boolean) {
    setHideOnStartup(checked);
    setStartupIntroHidden(checked);
  }

  function selectMode(modeId: string) {
    setSelectedModeId(modeId);
    onSelectMode(modeId);
  }

  return (
    <div className="intro-backdrop" role="presentation">
      <section className="intro-window" role="dialog" aria-modal="true" aria-labelledby="intro-title">
        <header>
          <span>Getting started</span>
          <h2 id="intro-title">{introTitle}</h2>
        </header>
        <p className="intro-lead">{introLead}</p>
        <p>{introShortText}</p>
        <section className="intro-section">
          <h3>What it is for</h3>
          <ul>
            {introPurposeBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>
        <section className="intro-section">
          <h3>How it works</h3>
          <p>{introHowToStartText}</p>
          <ul>
            {introHowItWorksBullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </section>
        <section className="intro-section">
          <h3>No points, no winning condition</h3>
          <p>{introNoPointsText}</p>
          <p>{introOutcomeText}</p>
        </section>
        <section className="intro-section">
          <h3>Modes</h3>
          <p>{introStandardText}</p>
          <p>{introModesText}</p>
        </section>
        <section className="intro-recommended-modes" aria-label="Recommended modes">
          <h3>Recommended modes</h3>
          <div className="intro-mode-grid">
            <button
              type="button"
              className={selectedModeId === "standard" ? "selected" : ""}
              onClick={() => selectMode("standard")}
            >
              <strong>Standard <span>Default</span></strong>
              <small>
                Recommended for machine learning, data science, and mathematical modelling.
                Use it to inspect data, assumptions, model behaviour, blind spots, and decisions.
              </small>
            </button>
            <button
              type="button"
              className={selectedModeId === "abstraction" ? "selected" : ""}
              onClick={() => selectMode("abstraction")}
            >
              <strong>Abstraction</strong>
              <small>
                Recommended for broader structured thinking. Use it for research, teaching,
                business, creative, or strategic problems beyond a specific model.
              </small>
            </button>
          </div>
        </section>
        <section className="intro-examples" aria-label="Example sessions">
          <h3>See an example</h3>
          <div className="intro-example-actions">
            <button type="button" onClick={() => onStartExample("sensor-calibration-review")}>
              Example: Sensor Calibration
            </button>
            <button type="button" onClick={() => onStartExample("business-strategy-abstraction")}>
              Example: Business Strategy
            </button>
          </div>
        </section>
        <section className="intro-manual" aria-label="Manual">
          <h3>Manual</h3>
          <p>{introManualText}</p>
          {manualUrl ? (
            <a className="intro-link-button" href={manualUrl} target="_blank" rel="noopener noreferrer">
              Open Manual PDF
            </a>
          ) : (
            <button type="button" disabled title="The manual PDF is not bundled with this app build.">
              Manual PDF is not bundled in this build.
            </button>
          )}
        </section>
        <label className="intro-checkbox">
          <input
            type="checkbox"
            checked={hideOnStartup}
            onChange={(event) => updateHideOnStartup(event.target.checked)}
          />
          Do not show this again on startup.
        </label>
        <footer>
          <button type="button" onClick={onOpenHelp}>
            Learn more in Help
          </button>
          <button type="button" className="primary" onClick={onContinue}>
            Start / Continue
          </button>
        </footer>
      </section>
    </div>
  );
}
