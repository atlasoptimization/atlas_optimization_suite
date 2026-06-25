import { useEffect, useMemo, useReducer, useState } from "react";
import { getSelectedAtlasCard } from "../core/cards";
import { atlasReducer } from "../core/reducer";
import type { AtlasAction, AtlasCardType, AtlasWorkbenchState } from "../core/types";
import {
  loadAtlasWorkbenchState,
  saveAtlasWorkbenchState
} from "../storage/localAtlasStorage";
import { AtlasToolbar, type AtlasToolbarAction } from "./AtlasToolbar";
import { AtlasWorkbench } from "./workbench/AtlasWorkbench";
import { AtlasInspector } from "./inspector/AtlasInspector";
import { AtlasModelDock } from "./dock/AtlasModelDock";
import { AtlasSolutionPanel } from "./solution/AtlasSolutionPanel";
import { AtlasSearchPalette } from "./search/AtlasSearchPalette";
import "./atlas.css";

const PLACEHOLDER_ACTION_LABELS: Record<AtlasToolbarAction, string> = {
  evaluate: "Evaluate is ready for the prototype evaluator.",
  solve: "Solve will connect to the Python/CVXPY backend in a later step.",
  inspect: "Inspect will run model validation once Atlas IR exists.",
  export: "Export will download Atlas IR JSON once the model store exists.",
  undo: "Undid the last Atlas workbench change.",
  redo: "Redid the last Atlas workbench change.",
  search: "Search is open.",
  clear: "Cleared the Atlas workbench."
};

type AtlasHistory = {
  past: AtlasWorkbenchState[];
  present: AtlasWorkbenchState;
  future: AtlasWorkbenchState[];
};

function createHistoryState(present: AtlasWorkbenchState): AtlasHistory {
  return { past: [], present, future: [] };
}

function historyReducer(history: AtlasHistory, action: AtlasAction | { type: "history.undo" } | { type: "history.redo" }) {
  if (action.type === "history.undo") {
    const previous = history.past.at(-1);
    if (!previous) return history;
    return {
      past: history.past.slice(0, -1),
      present: previous,
      future: [history.present, ...history.future]
    };
  }

  if (action.type === "history.redo") {
    const next = history.future[0];
    if (!next) return history;
    return {
      past: [...history.past, history.present].slice(-100),
      present: next,
      future: history.future.slice(1)
    };
  }

  const nextPresent = atlasReducer(history.present, action);
  if (nextPresent === history.present) return history;

  if (action.type === "workbench.load") return createHistoryState(nextPresent);

  return {
    past: [...history.past, history.present].slice(-100),
    present: nextPresent,
    future: []
  };
}

export function AtlasApp() {
  const [history, dispatch] = useReducer(
    historyReducer,
    undefined,
    () => createHistoryState(loadAtlasWorkbenchState())
  );
  const [lastAction, setLastAction] = useState("Atlas Optimization Suite prototype loaded.");
  const [searchOpen, setSearchOpen] = useState(false);
  const workbench = history.present;
  const selectedCard = getSelectedAtlasCard(workbench);
  const updatedAt = useMemo(
    () => new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date()),
    [lastAction]
  );

  useEffect(() => {
    saveAtlasWorkbenchState(workbench);
  }, [workbench]);

  function createCard(cardType: AtlasCardType) {
    dispatch({ type: "card.create", cardType });
    setLastAction(`Created ${cardType} card.`);
  }

  function handleToolbarAction(action: AtlasToolbarAction) {
    if (action === "search") {
      setSearchOpen(true);
    } else if (action === "undo") {
      dispatch({ type: "history.undo" });
    } else if (action === "redo") {
      dispatch({ type: "history.redo" });
    } else if (action === "clear") {
      dispatch({ type: "workbench.clear" });
    }

    setLastAction(PLACEHOLDER_ACTION_LABELS[action]);
  }

  return (
    <div className="atlas-app-shell">
      <AtlasToolbar
        onAction={handleToolbarAction}
        onCreateCard={createCard}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />

      <main className="atlas-main-layout" aria-label="Atlas Optimization Suite workbench">
        <section className="atlas-workbench-column">
          <AtlasWorkbench
            cards={workbench.cards}
            selectedCardId={workbench.selectedCardId}
            onSelectCard={(cardId) => dispatch({ type: "card.select", cardId })}
            onMoveCard={(cardId, position) => dispatch({ type: "card.move", cardId, position })}
          />
          <AtlasModelDock cards={workbench.cards} />
        </section>

        <aside className="atlas-side-panel" aria-label="Inspector and solution panel">
          <AtlasInspector
            card={selectedCard}
            onDeleteCard={(cardId) => {
              dispatch({ type: "card.delete", cardId });
              setLastAction("Deleted selected card.");
            }}
            onClear={() => {
              dispatch({ type: "workbench.clear" });
              setLastAction(PLACEHOLDER_ACTION_LABELS.clear);
            }}
          />
          <AtlasSolutionPanel statusMessage={lastAction} updatedAt={updatedAt} />
        </aside>
      </main>

      {searchOpen && (
        <AtlasSearchPalette
          onClose={() => {
            setSearchOpen(false);
            setLastAction("Search closed.");
          }}
        />
      )}
    </div>
  );
}
