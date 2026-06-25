import { useMemo, useState } from "react";
import type { CustomGameMode, GameMode, ModeRecommendation } from "../../core/types/mode";
import { scriptedSessions } from "../../demo/scriptedSessions";
import { groupModesByCategory } from "../../modes/modeCategories";

type ModeListProps = {
  modes: GameMode[];
  activeModeId: string | undefined;
  activeRecommendation?: ModeRecommendation | null;
  onSelectMode: (modeId: string) => void;
  onExecuteRecommendation?: () => void;
  onLoadExampleSession?: (scriptId: string) => void;
  onEditCustomMode?: (mode: CustomGameMode) => void;
  onDeleteCustomMode?: (modeId: string) => void;
};

export function ModeList({
  modes,
  activeModeId,
  activeRecommendation,
  onSelectMode,
  onExecuteRecommendation,
  onLoadExampleSession,
  onEditCustomMode,
  onDeleteCustomMode
}: ModeListProps) {
  const groupedModes = useMemo(() => groupModesByCategory(modes), [modes]);
  const [expandedModeId, setExpandedModeId] = useState<string | null>(activeModeId ?? null);
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  function matchesQuery(mode: GameMode) {
    if (!normalizedQuery) return true;
    return [
      mode.name,
      mode.purpose,
      mode.shortDescription,
      mode.whenToUse,
      mode.procedureSummary,
      mode.category
    ].some((value) => value?.toLowerCase().includes(normalizedQuery));
  }

  return (
    <div className="mode-list">
      <label className="mode-search">
        Search modes
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, purpose, category..."
        />
      </label>

      {groupedModes.map((group) => {
        const visibleModes = group.modes.filter(matchesQuery);
        if (visibleModes.length === 0) return null;

        return (
          <details key={group.id} className={`mode-category mode-category-${group.id}`} open>
            <summary>
              <span>{group.label}</span>
              <small>{visibleModes.length}</small>
            </summary>
            <div className="mode-category-list" data-testid="mode-category-list">
              {visibleModes.map((mode) => {
                const isActive = activeModeId === mode.id;
                const isExpanded = expandedModeId === mode.id;
                const customMode = "isCustom" in mode && mode.isCustom === true
                  ? (mode as CustomGameMode)
                  : null;

                return (
                  <article
                    key={mode.id}
                    className={`mode-list-row ${isActive ? "active" : ""} ${
                      isExpanded ? "expanded" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="mode-list-summary"
                      onClick={() => setExpandedModeId(isExpanded ? null : mode.id)}
                      aria-expanded={isExpanded}
                    >
                      <span className="mode-list-heading">
                        <strong>{mode.name}</strong>
                        {isActive && <em>Active</em>}
                      </span>
                      <span>{mode.purpose}</span>
                      <small>{formatDomainVector(mode.domainVector)}</small>
                    </button>

                    {isExpanded && (
                      <div className="mode-list-detail">
                        {mode.shortDescription && <p>{mode.shortDescription}</p>}
                        {mode.whenToUse && (
                          <Detail label="Use when" value={mode.whenToUse} />
                        )}
                        {mode.procedureSummary && (
                          <Detail label="Procedure" value={mode.procedureSummary} />
                        )}
                        {mode.commentary && <Detail label="Interpretation note" value={mode.commentary} />}
                        <div className="mode-vector">
                          {Object.entries(mode.domainVector).map(([domain, value]) => (
                            <span key={domain}>
                              {domain}: <strong>{value}</strong>
                            </span>
                          ))}
                        </div>
                        {mode.setupInstructions.length > 0 && (
                          <ol className="mode-setup">
                            {mode.setupInstructions.map((instruction) => (
                              <li key={instruction}>{instruction}</li>
                            ))}
                          </ol>
                        )}
                        {isActive && activeRecommendation && (
                          <section className="mode-list-recommendation">
                            <strong>Current recommendation</strong>
                            <span>Mechanical: {activeRecommendation.mechanical ?? activeRecommendation.label}</span>
                            <p>Interpretation: {activeRecommendation.interpretation ?? activeRecommendation.description}</p>
                          </section>
                        )}
                        {mode.id === "scripted-demo" && onLoadExampleSession && (
                          <section className="mode-list-examples" data-testid="mode-list-example-sessions">
                            <strong>Choose an example session</strong>
                            <p>Scripted walkthroughs that place cards, notes, and arrows step by step.</p>
                            <div className="mode-list-example-actions">
                              {scriptedSessions.map((script) => (
                                <button
                                  key={script.id}
                                  type="button"
                                  onClick={() => onLoadExampleSession(script.id)}
                                >
                                  {script.title}
                                </button>
                              ))}
                            </div>
                          </section>
                        )}
                        <div className="mode-list-actions">
                          <button type="button" onClick={() => onSelectMode(mode.id)}>
                            {isActive ? "Selected" : "Select mode"}
                          </button>
                          {isActive && activeRecommendation && onExecuteRecommendation && (
                            <button
                              type="button"
                              onClick={onExecuteRecommendation}
                              disabled={activeRecommendation.actionKind === "complete"}
                            >
                              Execute recommendation
                            </button>
                          )}
                          {customMode && onEditCustomMode && (
                            <button type="button" onClick={() => onEditCustomMode(customMode)}>
                              Edit
                            </button>
                          )}
                          {customMode && onDeleteCustomMode && (
                            <button type="button" onClick={() => onDeleteCustomMode(mode.id)}>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <strong>{label}:</strong> {value}
    </p>
  );
}

function formatDomainVector(domainVector: GameMode["domainVector"]) {
  return Object.entries(domainVector)
    .map(([domain, value]) => `${domain} ${value}`)
    .join(" · ");
}
