import type { ReactNode } from "react";
import type { ExecutionBackend, ExecutionBackendId } from "../execution";
import {
  ATLAS_HELP_COMMAND_IDS,
  ATLAS_HISTORY_COMMAND_IDS,
  ATLAS_PRIMARY_COMMAND_IDS,
  isAtlasCommandEnabled,
  type AtlasCommandContext,
  type AtlasCommandDescriptor,
  type AtlasCommandId
} from "./appCommands";
import { buildAtlasMenus } from "./appMenus";
import { isAtlasWorkbenchView } from "./views/viewRegistry";

export type AtlasToolbarAction = Exclude<AtlasCommandId, `view:${string}`>;

type AtlasToolbarProps = {
  onAction: (action: AtlasToolbarAction) => void;
  onCommand?: (command: AtlasCommandId) => void;
  executionBackends?: ExecutionBackend[];
  executionBackendId?: ExecutionBackendId;
  onExecutionBackendChange?: (backendId: ExecutionBackendId) => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection?: boolean;
};

export function AtlasToolbar({
  onAction,
  onCommand,
  executionBackends = [],
  executionBackendId,
  onExecutionBackendChange,
  canUndo,
  canRedo,
  hasSelection = false
}: AtlasToolbarProps) {
  const commandContext: AtlasCommandContext = { canUndo, canRedo, hasSelection };
  const runCommand = (commandId: AtlasCommandId) => {
    if (onCommand) {
      onCommand(commandId);
      return;
    }
    if (isAtlasToolbarAction(commandId)) onAction(commandId);
  };

  return (
    <header className="atlas-toolbar">
      <div className="atlas-brand-block">
        <strong>Atlas Optimization Suite</strong>
        <span>CVXPY-first optimization workbench</span>
      </div>

      <nav aria-label="Atlas application menus" className="atlas-app-menus">
        {buildAtlasMenus().map((menu) => (
          <MenuGroup key={menu.id} label={menu.label}>
            {menu.label === "Run" && executionBackends.length > 0 && executionBackendId && (
              <ExecutionSelector
                executionBackends={executionBackends}
                executionBackendId={executionBackendId}
                onExecutionBackendChange={onExecutionBackendChange}
              />
            )}
            {menu.commands.map((command, index) => (
              <CommandButton
                key={`${command.id}-${command.label}-${index}`}
                command={command}
                context={commandContext}
                onRun={runCommand}
              />
            ))}
            {menu.label === "File" && (
              <button type="button" disabled title="Recent project tracking is not implemented yet.">
                Recent Projects
              </button>
            )}
            {menu.label === "Edit" && (
              <>
                <button type="button" disabled title="Clipboard editing is not implemented yet.">Cut</button>
                <button type="button" disabled title="Clipboard editing is not implemented yet.">Copy</button>
                <button type="button" disabled title="Clipboard editing is not implemented yet.">Paste</button>
              </>
            )}
            {menu.label === "View" && (
              <>
                <button type="button" disabled title="Fit to view is available from workbench navigation controls later.">Fit to view</button>
                <button type="button" disabled title="Center view is available from workbench navigation controls later.">Center view</button>
                <button type="button" disabled title="Grid toggle will be added after view settings are persisted.">Toggle Grid</button>
                <button type="button" disabled title="Panel toggles will be added after layout persistence.">Toggle Constructor</button>
                <button type="button" disabled title="Panel toggles will be added after layout persistence.">Toggle Explorer</button>
                <button type="button" disabled title="Panel toggles will be added after layout persistence.">Toggle Inspector</button>
                <button type="button" disabled title="Bottom panel toggles will be added after layout persistence.">Toggle Solution/Bottom Panel</button>
              </>
            )}
          </MenuGroup>
        ))}
      </nav>

      <nav aria-label="Atlas primary actions" className="atlas-toolbar-actions">
        {executionBackends.length > 0 && executionBackendId && (
          <label className="atlas-execution-selector">
            <span>Execution</span>
            <select
              value={executionBackendId}
              aria-label="Execution backend"
              onChange={(event) =>
                onExecutionBackendChange?.(event.currentTarget.value as ExecutionBackendId)
              }
            >
              {executionBackends.map((backend) => (
                <option key={backend.id} value={backend.id} disabled={Boolean(backend.unavailableReason)}>
                  {backend.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {ATLAS_PRIMARY_COMMAND_IDS.map((commandId) => (
          <CommandButton key={commandId} commandId={commandId} context={commandContext} onRun={runCommand} />
        ))}
      </nav>

      <nav aria-label="Atlas editing actions" className="atlas-toolbar-actions atlas-toolbar-secondary">
        {ATLAS_HISTORY_COMMAND_IDS.map((commandId) => (
          <CommandButton key={commandId} commandId={commandId} context={commandContext} onRun={runCommand} />
        ))}
      </nav>

      <nav aria-label="Atlas help actions" className="atlas-toolbar-actions atlas-toolbar-secondary">
        {ATLAS_HELP_COMMAND_IDS.map((commandId) => (
          <CommandButton key={commandId} commandId={commandId} context={commandContext} onRun={runCommand} />
        ))}
      </nav>

      <a className="atlas-deck-link" href="?app=deck">
        Open Data Science Deck
      </a>
    </header>
  );
}

function CommandButton({
  command,
  commandId,
  context,
  onRun
}: {
  command?: AtlasCommandDescriptor;
  commandId?: AtlasCommandId;
  context: AtlasCommandContext;
  onRun: (commandId: AtlasCommandId) => void;
}) {
  const resolved = command ?? (commandId ? buildAtlasMenus().flatMap((menu) => menu.commands).find((item) => item.id === commandId) : undefined);
  if (!resolved) return null;
  const enabled = isAtlasCommandEnabled(resolved, context);
  return (
    <button
      type="button"
      disabled={!enabled}
      title={!enabled ? resolved.disabledReason ?? "Command is unavailable in the current state." : resolved.shortcut}
      onClick={() => onRun(resolved.id)}
    >
      {resolved.label}
    </button>
  );
}

function ExecutionSelector({
  executionBackends,
  executionBackendId,
  onExecutionBackendChange
}: {
  executionBackends: ExecutionBackend[];
  executionBackendId: ExecutionBackendId;
  onExecutionBackendChange?: (backendId: ExecutionBackendId) => void;
}) {
  return (
    <label className="atlas-menu-field">
      <span>Execution backend</span>
      <select
        value={executionBackendId}
        onChange={(event) =>
          onExecutionBackendChange?.(event.currentTarget.value as ExecutionBackendId)
        }
      >
        {executionBackends.map((backend) => (
          <option key={backend.id} value={backend.id} disabled={Boolean(backend.unavailableReason)}>
            {backend.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function isAtlasToolbarAction(commandId: AtlasCommandId): commandId is AtlasToolbarAction {
  if (commandId.startsWith("view:")) return false;
  return !isAtlasWorkbenchView(commandId);
}

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="atlas-app-menu">
      <summary>{label}</summary>
      <div className="atlas-app-menu-popover">{children}</div>
    </details>
  );
}
