import { useEffect, useMemo, useReducer, useState } from "react";
import { getSelectedAtlasCard } from "../core/cards";
import { getFunctionDependencySummary, getTaggedSumMatchingCards } from "../core/functions";
import { getSelectedAtlasGroup } from "../core/groups";
import { evaluateAtlasQuery, getSelectedAtlasQuery } from "../core/queries";
import { atlasReducer } from "../core/reducer";
import type { AtlasAction, AtlasCardType, AtlasWorkbenchState } from "../core/types";
import { ATLAS_CARD_TEMPLATES, getAtlasCardTemplate } from "../core/templates";
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
import { AtlasQueryBuilder } from "./query/AtlasQueryBuilder";
import { AtlasPropertySelector } from "./query/AtlasPropertySelector";
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
  const [dependencyHighlightEnabled, setDependencyHighlightEnabled] = useState(true);
  const workbench = history.present;
  const selectedCard = getSelectedAtlasCard(workbench);
  const selectedGroup = getSelectedAtlasGroup(workbench);
  const selectedQuery = getSelectedAtlasQuery(workbench);
  const highlightedCardIds = useMemo(
    () => {
      if (selectedQuery) {
        return new Set(evaluateAtlasQuery(selectedQuery, workbench.cards).map((card) => card.id));
      }

      if (
        dependencyHighlightEnabled &&
        selectedCard?.type === "function" &&
        selectedCard.functionKind === "tagged_sum"
      ) {
        return new Set(
          getTaggedSumMatchingCards(selectedCard, workbench.queries, workbench.cards).map(
            (card) => card.id
          )
        );
      }

      return new Set<string>();
    },
    [dependencyHighlightEnabled, selectedQuery, selectedCard, workbench.cards, workbench.queries]
  );
  const dependencyPropertyNamesByCardId = useMemo(() => {
    if (
      !dependencyHighlightEnabled ||
      selectedQuery ||
      selectedCard?.type !== "function" ||
      selectedCard.functionKind !== "tagged_sum"
    ) {
      return {};
    }

    const dependencySummary = getFunctionDependencySummary(
      selectedCard,
      workbench.queries,
      workbench.cards
    );

    return Object.fromEntries(
      dependencySummary.matchedCards.map((card) => [
        card.id,
        new Set(dependencySummary.usedProperties)
      ])
    );
  }, [dependencyHighlightEnabled, selectedQuery, selectedCard, workbench.cards, workbench.queries]);
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

  function createCardFromTemplate(templateId: string) {
    const template = getAtlasCardTemplate(templateId);
    dispatch({ type: "card.createFromTemplate", templateId });
    setLastAction(template ? `Created ${template.name} card.` : "Template not found.");
  }

  function createGroup() {
    dispatch({ type: "group.create" });
    setLastAction("Created visual group.");
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
        onCreateFromTemplate={createCardFromTemplate}
        onCreateGroup={createGroup}
        templates={ATLAS_CARD_TEMPLATES}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />

      <main className="atlas-main-layout" aria-label="Atlas Optimization Suite workbench">
        <section className="atlas-workbench-column">
          <AtlasWorkbench
            cards={workbench.cards}
            groups={workbench.groups}
            queries={workbench.queries}
            highlightedCardIds={highlightedCardIds}
            dependencyPropertyNamesByCardId={dependencyPropertyNamesByCardId}
            selectedCardId={workbench.selectedCardId}
            selectedGroupId={workbench.selectedGroupId}
            onSelectCard={(cardId) => dispatch({ type: "card.select", cardId })}
            onSelectGroup={(groupId) => dispatch({ type: "group.select", groupId })}
            onMoveCard={(cardId, position) => dispatch({ type: "card.move", cardId, position })}
          />
          <AtlasModelDock cards={workbench.cards} />
        </section>

        <aside className="atlas-side-panel" aria-label="Inspector and solution panel">
          <AtlasInspector
            card={selectedCard}
            group={selectedGroup}
            cards={workbench.cards}
            queries={workbench.queries}
            dependencyHighlightEnabled={dependencyHighlightEnabled}
            onAddTag={(cardId, key, value) => {
              dispatch({ type: "tag.add", cardId, key, value });
              setLastAction(`Added tag ${key.trim()}.`);
            }}
            onUpdateTag={(cardId, tagId, key, value) => {
              dispatch({ type: "tag.update", cardId, tagId, key, value });
              setLastAction(`Updated tag ${key.trim()}.`);
            }}
            onDeleteTag={(cardId, tagId) => {
              dispatch({ type: "tag.delete", cardId, tagId });
              setLastAction("Deleted tag.");
            }}
            onAddProperty={(cardId, property) => {
              dispatch({ type: "property.add", cardId, ...property });
              setLastAction(`Added property ${property.name.trim()}.`);
            }}
            onUpdateProperty={(cardId, propertyId, property) => {
              dispatch({ type: "property.update", cardId, propertyId, ...property });
              setLastAction(`Updated property ${property.name.trim()}.`);
            }}
            onDeleteProperty={(cardId, propertyId) => {
              dispatch({ type: "property.delete", cardId, propertyId });
              setLastAction("Deleted property.");
            }}
            onUpdateTaggedSum={(cardId, patch) => {
              dispatch({ type: "function.taggedSum.update", cardId, patch });
              setLastAction("Updated TaggedSum function.");
            }}
            onToggleDependencyHighlight={() => {
              setDependencyHighlightEnabled((enabled) => !enabled);
              setLastAction("Toggled dependency highlighting.");
            }}
            onUpdateGroup={(groupId, patch) => {
              dispatch({ type: "group.update", groupId, patch });
              setLastAction("Updated group.");
            }}
            onDeleteGroup={(groupId) => {
              dispatch({ type: "group.delete", groupId });
              setLastAction("Deleted group.");
            }}
            onDeleteCard={(cardId) => {
              dispatch({ type: "card.delete", cardId });
              setLastAction("Deleted selected card.");
            }}
            onClear={() => {
              dispatch({ type: "workbench.clear" });
              setLastAction(PLACEHOLDER_ACTION_LABELS.clear);
            }}
          />
          <AtlasQueryBuilder
            cards={workbench.cards}
            queries={workbench.queries}
            selectedQueryId={workbench.selectedQueryId}
            onCreateQuery={() => {
              dispatch({ type: "query.create" });
              setLastAction("Created query.");
            }}
            onSelectQuery={(queryId) => {
              dispatch({ type: "query.select", queryId });
              setLastAction(queryId ? "Selected query." : "Cleared query selection.");
            }}
            onUpdateQuery={(queryId, name) => {
              dispatch({ type: "query.update", queryId, patch: { name } });
              setLastAction("Updated query.");
            }}
            onDuplicateQuery={(queryId) => {
              dispatch({ type: "query.duplicate", queryId });
              setLastAction("Duplicated query.");
            }}
            onDeleteQuery={(queryId) => {
              dispatch({ type: "query.delete", queryId });
              setLastAction("Deleted query.");
            }}
            onAddCondition={(queryId, list, key, value) => {
              dispatch({ type: "query.condition.add", queryId, list, key, value });
              setLastAction("Added query condition.");
            }}
            onUpdateCondition={(queryId, list, conditionId, key, value) => {
              dispatch({ type: "query.condition.update", queryId, list, conditionId, key, value });
              setLastAction("Updated query condition.");
            }}
            onDeleteCondition={(queryId, list, conditionId) => {
              dispatch({ type: "query.condition.delete", queryId, list, conditionId });
              setLastAction("Deleted query condition.");
            }}
          />
          <AtlasPropertySelector
            cards={workbench.cards}
            queries={workbench.queries}
            selectedQueryId={workbench.selectedQueryId}
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
