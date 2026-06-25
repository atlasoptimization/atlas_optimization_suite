import { useEffect, useMemo, useState } from "react";
import { resolveManualPdfUrl } from "../../assets/manualAsset";
import { guideSections } from "../../content/guide";
import { getCustomDomainsFolderPath } from "../../customDomains/customDomainInstructions";
import { scriptedSessions } from "../../demo/scriptedSessions";
import { GuideSection } from "./GuideSection";

type GuidePanelProps = {
  initialSectionId?: string;
  handbookPath?: string;
  onLoadExampleSession?: (scriptId?: string) => void;
  onShowStartupIntro?: () => void;
};

export function GuidePanel({
  initialSectionId,
  handbookPath,
  onLoadExampleSession,
  onShowStartupIntro
}: GuidePanelProps) {
  const [activeSectionId, setActiveSectionId] = useState(initialSectionId ?? guideSections[0]?.id ?? "");
  const resolvedHandbookPath = useMemo(() => resolveManualPdfUrl(handbookPath), [handbookPath]);
  const handbookAvailable = Boolean(resolvedHandbookPath);
  const activeSection =
    guideSections.find((section) => section.id === activeSectionId) ?? guideSections[0];

  useEffect(() => {
    if (initialSectionId) setActiveSectionId(initialSectionId);
  }, [initialSectionId]);

  return (
    <section className="guide-panel" data-testid="help-panel">
      <header className="guide-panel-header">
        <div>
          <h2>Help / Guide</h2>
          <p>Concise handbook notes for using the deck as a modelling instrument.</p>
        </div>
        {handbookAvailable ? (
          <a href={resolvedHandbookPath ?? undefined} target="_blank" rel="noopener noreferrer">
            Open full handbook
          </a>
        ) : (
          <button type="button" disabled title="The full handbook PDF is not bundled with this app build.">
            Full handbook not bundled
          </button>
        )}
        {onShowStartupIntro && (
          <button type="button" onClick={onShowStartupIntro}>
            Show startup intro
          </button>
        )}
      </header>

      <div className="guide-layout">
        <nav className="guide-nav" aria-label="Guide sections">
          {guideSections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeSection.id ? "active" : ""}
              onClick={() => setActiveSectionId(section.id)}
            >
              {section.title}
            </button>
          ))}
        </nav>
        {activeSection && <GuideSection section={activeSection} />}
        {activeSection?.id === "example-session" && onLoadExampleSession && (
          <div className="guide-inline-tools">
            <strong>Read example</strong>
            <span>These guided examples show how cards, notes, and arrows can structure a modelling discussion.</span>
            {scriptedSessions.map((script) => (
              <button key={script.id} type="button" onClick={() => onLoadExampleSession(script.id)}>
                Load {script.title}
              </button>
            ))}
          </div>
        )}
        {activeSection?.id === "custom-domains" && (
          <div className="guide-inline-tools">
            <span>Folder: <code>{getCustomDomainsFolderPath()}</code></span>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(getCustomDomainsFolderPath())}
            >
              Copy folder path
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
