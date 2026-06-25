import { useState } from "react";
import type {
  CustomGameMode,
  GameMode,
  ModeRecommendation
} from "../../core/types/mode";
import type { SessionState } from "../../core/types/session";
import type { DeckCard } from "../../core/types/card";
import type { CustomModeInput } from "../../storage/localCustomModesStorage";
import { getNextDomain } from "../../engine/piles";
import { DEFAULT_MODE_ID } from "../../modes/constants";
import { enrichModeRecommendation } from "../../modes/modeRecommendationMetadata";
import { ModeEditor } from "./ModeEditor";
import { ModeList } from "./ModeList";

type ModePanelProps = {
  state: SessionState;
  modes: GameMode[];
  cards: DeckCard[];
  onModeChange: (modeId: string | undefined) => void;
  onCreateCustomMode: (input: CustomModeInput) => void;
  onUpdateCustomMode: (mode: CustomGameMode, input: CustomModeInput) => void;
  onDeleteCustomMode: (modeId: string) => void;
  onExecuteRecommendation: () => void;
  onCopyModeAiPrompt: (questionContext: string) => void;
  onInspectCurrentDomainPile: (domain?: string) => void;
  onLoadExampleSession?: (scriptId: string) => void;
  onStartTimerPreset: (preset: NonNullable<GameMode["timerPreset"]>) => void;
  enableTimers: boolean;
  disabledFeatureMessage: string;
};

export function ModePanel({
  state,
  modes,
  cards,
  onModeChange,
  onCreateCustomMode,
  onUpdateCustomMode,
  onDeleteCustomMode,
  onExecuteRecommendation,
  onCopyModeAiPrompt,
  onInspectCurrentDomainPile,
  onLoadExampleSession,
  onStartTimerPreset,
  enableTimers,
  disabledFeatureMessage
}: ModePanelProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingMode, setEditingMode] = useState<CustomGameMode | null>(null);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiQuestionContext, setAiQuestionContext] = useState("");
  const activeMode =
    modes.find((mode) => mode.id === state.activeModeId) ??
    modes.find((mode) => mode.id === DEFAULT_MODE_ID) ??
    modes[0];
  const hint = activeMode?.nextStepHint?.(state);
  const customMode = isCustomMode(activeMode) ? activeMode : null;
  const currentDomain = getNextDomain(state.drawCycle);
  const recommendation = enrichModeRecommendation({
    mode: activeMode,
    recommendation:
      activeMode.recommendedAction?.(state, cards) ??
      getModeRecommendationLabel(activeMode.id, currentDomain),
    session: state
  });
  const recommendationNeedsDomain =
    recommendation?.actionKind !== "place-domain-masters" &&
    recommendation?.actionKind !== "place-cards" &&
    recommendation?.actionKind !== "complete";
  const inspectDomain = recommendation?.domain || currentDomain;

  if (!activeMode) return null;

  return (
    <section className="mode-panel" data-testid="mode-panel">
      <section className="mode-ai-recommend-callout mode-list-top-action">
        <h4>Ask AI to recommend a mode</h4>
        <p>
          Copies a mode-selection prompt for ChatGPT or another assistant. The app does not call a browser-local AI API.
        </p>
        <button
          type="button"
          data-testid="mode-ai-recommend-button"
          onClick={() => setAiPromptOpen(true)}
        >
          Ask AI to recommend a mode
        </button>
      </section>
      {aiPromptOpen && (
        <section className="mode-ai-prompt-modal" role="dialog" aria-modal="true">
          <div className="mode-ai-prompt-header">
            <h4>Ask AI to recommend a mode</h4>
            <button type="button" onClick={() => setAiPromptOpen(false)}>
              Close
            </button>
          </div>
          <p className="muted">
            Enter the question or context, then copy a prompt for ChatGPT or another assistant. No external AI service is called by the app.
          </p>
          <label>
            Question/context
            <textarea
              value={aiQuestionContext}
              onChange={(event) => setAiQuestionContext(event.target.value)}
              placeholder="Paste your modelling question, dataset, decision, or situation."
            />
          </label>
          <button type="button" onClick={() => onCopyModeAiPrompt(aiQuestionContext)}>
            Copy prompt for AI
          </button>
        </section>
      )}
      <div className="mode-controls">
        <div className="mode-active-summary selected" data-testid="active-mode-summary">
          <span>Active mode</span>
          <strong>{activeMode.name}</strong>
        </div>
      </div>

      <h3>{activeMode.name}</h3>
      {activeMode.shortDescription && (
        <p className="mode-description mode-short-description">
          {activeMode.shortDescription}
        </p>
      )}

      <div className="mode-explainer">
        <div>
          <strong>Purpose</strong>
          <span>{activeMode.purpose}</span>
        </div>
        {activeMode.whenToUse && (
          <div>
            <strong>Use when</strong>
            <span>{activeMode.whenToUse}</span>
          </div>
        )}
        {activeMode.procedureSummary && (
          <div>
            <strong>Procedure</strong>
            <span>{activeMode.procedureSummary}</span>
          </div>
        )}
      </div>

      <p className="mode-description">{activeMode.description}</p>

      {activeMode.commentary && (
        <p className="mode-description">{activeMode.commentary}</p>
      )}

      <div className="mode-vector">
        {Object.entries(activeMode.domainVector).map(([domain, value]) => (
          <span key={domain}>
            {domain}: <strong>{value}</strong>
          </span>
        ))}
      </div>

      <ol className="mode-setup">
        {activeMode.setupInstructions.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>

      {customMode?.procedure && (
        <p className="mode-description">{customMode.procedure}</p>
      )}

      {customMode?.notes && (
        <p className="mode-description">{customMode.notes}</p>
      )}

      {hint && <p className="mode-hint">{hint}</p>}
      {activeMode.timerPreset && enableTimers && (
        <section className="mode-recommendation">
          <h4>Timer</h4>
          <p>{activeMode.timerPreset.messageOnFinish}</p>
          <div className="mode-recommendation-actions">
            <button type="button" onClick={() => onStartTimerPreset(activeMode.timerPreset!)}>
              {activeMode.timerPreset.label}
            </button>
          </div>
        </section>
      )}
      {activeMode.timerPreset && !enableTimers && (
        <section className="mode-recommendation">
          <h4>Timer</h4>
          <p className="disabled-feature-notice">
            {disabledFeatureMessage}
          </p>
        </section>
      )}
      {activeMode.id === "free" && (
        <section className="mode-recommendation">
          <h4>Free mode</h4>
          <p>Next uses the normal domain cycle and draws one random card. Manual actions stay available.</p>
          <div className="mode-recommendation-actions">
            <button type="button" onClick={() => onModeChange("free")}>
              Continue in Free mode
            </button>
          </div>
        </section>
      )}
      {recommendation && activeMode.id !== "free" && (
        <section className="mode-recommendation">
          <h4>Recommended action</h4>
          <p><strong>Mechanical:</strong> {recommendation.mechanical ?? recommendation.label}</p>
          <p><strong>Interpretation:</strong> {recommendation.interpretation ?? recommendation.description}</p>
          <div className="mode-recommendation-actions">
            <button
              type="button"
              onClick={onExecuteRecommendation}
              disabled={
                recommendation.actionKind === "complete" ||
                recommendationNeedsDomain &&
                !recommendation.domain &&
                !currentDomain
              }
            >
              {recommendation.label}
            </button>
            {inspectDomain && activeMode.id !== "minimalism" && (
              <button type="button" onClick={() => onInspectCurrentDomainPile(inspectDomain)}>
                Inspect {inspectDomain} pile
              </button>
            )}
          </div>
        </section>
      )}

      <ModeList
        modes={modes}
        activeModeId={activeMode.id}
        activeRecommendation={recommendation}
        onSelectMode={onModeChange}
        onExecuteRecommendation={onExecuteRecommendation}
        onLoadExampleSession={onLoadExampleSession}
        onEditCustomMode={(mode) => {
          setEditingMode(mode);
          setEditorOpen(true);
        }}
        onDeleteCustomMode={onDeleteCustomMode}
      />

      {editorOpen && (
        <ModeEditor
          mode={editingMode}
          onSave={(input) => {
            if (editingMode) onUpdateCustomMode(editingMode, input);
            else onCreateCustomMode(input);
            setEditorOpen(false);
            setEditingMode(null);
          }}
          onCancel={() => {
            setEditorOpen(false);
            setEditingMode(null);
          }}
        />
      )}
    </section>
  );
}

function isCustomMode(mode: GameMode): mode is CustomGameMode {
  return "isCustom" in mode && mode.isCustom === true;
}

function getModeRecommendationLabel(
  modeId: string,
  currentDomain: string
): ModeRecommendation | null {
  if (modeId === DEFAULT_MODE_ID) {
    return {
      label: currentDomain
        ? `Draw 5 and choose 1 from ${currentDomain}`
        : "Draw 5 and choose 1",
      description: currentDomain
        ? `Draw up to five ${currentDomain} candidates, choose one, and discard the rest.`
        : "Draw up to five candidates, choose one, and discard the rest.",
      actionKind: "choose-candidates",
      domain: currentDomain || undefined,
      count: 5,
      drawMode: "choose-1-from-n",
      subset: "full-domain"
    };
  }

  if (modeId === "true-tarot") {
    return {
      label: currentDomain
        ? `Draw hidden card from ${currentDomain}`
        : "Draw hidden card",
      description: currentDomain
        ? `Draw one ${currentDomain} card face-down and advance the cycle.`
        : "Draw one card face-down and advance the cycle.",
      actionKind: "draw-hidden",
      domain: currentDomain || undefined,
      drawMode: "secret-1",
      subset: "full-domain"
    };
  }

  return null;
}
