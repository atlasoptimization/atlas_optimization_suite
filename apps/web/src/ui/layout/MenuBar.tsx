import { useEffect, useRef, useState, type ReactNode } from "react";
import type { FeatureConfig } from "../../config/features";

export type OpenTopPanel = null | "view" | "mode" | "session" | "help" | "developer" | "customDomains";

type MenuBarProps = {
  cardCount: number;
  tableauCount: number;
  openPanel: OpenTopPanel;
  actionsMenu: ReactNode;
  onTogglePanel: (panel: Exclude<OpenTopPanel, null>) => void;
  onAddNote: () => void;
  onAddArrow: () => void;
  onRevealAll: () => void;
  onNewSession: () => void;
  onSave: () => void;
  onLoadLocalSession: () => void;
  onExportSession: () => void;
  onExportMarkdown: () => void;
  onExportDeskPng: () => void;
  onImportSession: (file: File) => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenSearch: () => void;
  features: FeatureConfig;
};

export function MenuBar({
  cardCount: _cardCount,
  tableauCount: _tableauCount,
  openPanel,
  actionsMenu,
  onTogglePanel,
  onAddNote,
  onAddArrow,
  onRevealAll,
  onNewSession,
  onSave,
  onLoadLocalSession,
  onExportSession,
  onExportMarkdown,
  onExportDeskPng,
  onImportSession,
  onClear,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenSearch,
  features
}: MenuBarProps) {
  const [openDropdown, setOpenDropdown] = useState<"file" | "edit" | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) setOpenDropdown(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenDropdown(null);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function togglePanel(panel: Exclude<OpenTopPanel, null>) {
    setOpenDropdown(null);
    onTogglePanel(panel);
  }

  return (
    <header className="top-menu" ref={headerRef}>
      <div className="brand">Data Science Deck Viewer</div>
      <nav>
        <details
          className="file-menu"
          open={openDropdown === "file"}
          onToggle={(event) => {
            if (event.currentTarget.open) setOpenDropdown("file");
          }}
        >
          <summary data-testid="menu-file" onClick={() => setOpenDropdown(openDropdown === "file" ? null : "file")}>
            File
          </summary>
          <div className="file-menu-panel">
            <button type="button" onClick={onNewSession}>
              New session
            </button>
            <FeatureMenuButton
              enabled={features.enableLocalSaveLoad}
              message={features.disabledFeatureMessage}
              githubUrl={features.githubUrl}
              onClick={onSave}
            >
              Save session locally
            </FeatureMenuButton>
            <FeatureMenuButton
              enabled={features.enableLocalSaveLoad}
              message={features.disabledFeatureMessage}
              githubUrl={features.githubUrl}
              onClick={onLoadLocalSession}
            >
              Load local session
            </FeatureMenuButton>
            {features.enableSessionJsonImportExport && (
              <>
                <button type="button" onClick={onExportSession}>
                  Export session JSON
                </button>
                <label className="file-menu-upload">
                  Import session JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      if (file) onImportSession(file);
                    }}
                  />
                </label>
              </>
            )}
            <button type="button" onClick={onExportMarkdown}>
              Export session report Markdown
            </button>
            {features.enableDeskPngExport && (
              <button type="button" onClick={onExportDeskPng}>
                Export desk as PNG
              </button>
            )}
            <button type="button" onClick={onClear}>
              Clear session
            </button>
          </div>
        </details>
        <details
          className="edit-menu"
          open={openDropdown === "edit"}
          onToggle={(event) => {
            if (event.currentTarget.open) setOpenDropdown("edit");
          }}
        >
          <summary data-testid="menu-edit" onClick={() => setOpenDropdown(openDropdown === "edit" ? null : "edit")}>
            Edit
          </summary>
          <div className="edit-menu-panel">
            <button type="button" onClick={onOpenSearch}>
              Search cards
            </button>
            <button type="button" onClick={onUndo} disabled={!canUndo}>
              Undo
            </button>
            <button type="button" onClick={onRedo} disabled={!canRedo}>
              Redo
            </button>
          </div>
        </details>
        <TopMenuButton panel="view" openPanel={openPanel} onTogglePanel={togglePanel}>
          View
        </TopMenuButton>
        <TopMenuButton panel="mode" openPanel={openPanel} onTogglePanel={togglePanel}>
          Mode
        </TopMenuButton>
        <TopMenuButton panel="session" openPanel={openPanel} onTogglePanel={togglePanel}>
          Session
        </TopMenuButton>
        <TopMenuButton panel="help" openPanel={openPanel} onTogglePanel={togglePanel}>
          Help
        </TopMenuButton>
        {(features.enableDeveloperPanel || features.enableAskAiContextExport) && (
          <TopMenuButton panel="developer" openPanel={openPanel} onTogglePanel={togglePanel}>
            {features.enableDeveloperPanel ? "Developer" : "Ask AI"}
          </TopMenuButton>
        )}
      </nav>
      <div className="top-actions">
        {actionsMenu}
        <button type="button" onClick={onAddNote}>
          Add note
        </button>
        <button type="button" onClick={onAddArrow}>
          Add arrow
        </button>
        <button type="button" onClick={onRevealAll}>
          Reveal all
        </button>
        <button type="button" data-testid="topbar-clear" onClick={onClear}>
          Clear
        </button>
      </div>
    </header>
  );
}

function FeatureMenuButton({
  enabled,
  message,
  githubUrl,
  onClick,
  children
}: {
  enabled: boolean;
  message: string;
  githubUrl: string;
  onClick: () => void;
  children: ReactNode;
}) {
  const title = enabled ? undefined : `${message} ${githubUrl}`;
  return (
    <button type="button" onClick={onClick} disabled={!enabled} title={title}>
      {children}
    </button>
  );
}

function TopMenuButton({
  panel,
  openPanel,
  onTogglePanel,
  children
}: {
  panel: Exclude<OpenTopPanel, null>;
  openPanel: OpenTopPanel;
  onTogglePanel: (panel: Exclude<OpenTopPanel, null>) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-top-menu-trigger
      data-testid={`menu-${panel}`}
      aria-expanded={openPanel === panel}
      onClick={() => onTogglePanel(panel)}
    >
      {children}
    </button>
  );
}
