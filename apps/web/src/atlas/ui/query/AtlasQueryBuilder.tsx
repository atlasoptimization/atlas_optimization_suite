import { useEffect, useState } from "react";
import type { AtlasCard, AtlasCardQuery } from "../../core/types";
import { evaluateAtlasQuery } from "../../core/queries";

type AtlasQueryBuilderProps = {
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  selectedQueryId: string | null;
  onCreateQuery: () => void;
  onSelectQuery: (queryId: string | null) => void;
  onUpdateQuery: (queryId: string, name: string) => void;
  onDuplicateQuery: (queryId: string) => void;
  onDeleteQuery: (queryId: string) => void;
  onAddCondition: (
    queryId: string,
    list: "includeTags" | "excludeTags",
    key: string,
    value: string
  ) => void;
  onUpdateCondition: (
    queryId: string,
    list: "includeTags" | "excludeTags",
    conditionId: string,
    key: string,
    value: string
  ) => void;
  onDeleteCondition: (
    queryId: string,
    list: "includeTags" | "excludeTags",
    conditionId: string
  ) => void;
};

type ConditionDraft = {
  key: string;
  value: string;
};

export function AtlasQueryBuilder({
  cards,
  queries,
  selectedQueryId,
  onCreateQuery,
  onSelectQuery,
  onUpdateQuery,
  onDuplicateQuery,
  onDeleteQuery,
  onAddCondition,
  onUpdateCondition,
  onDeleteCondition
}: AtlasQueryBuilderProps) {
  const selectedQuery = queries.find((query) => query.id === selectedQueryId) ?? null;
  const matches = selectedQuery ? evaluateAtlasQuery(selectedQuery, cards) : [];
  const [nameDraft, setNameDraft] = useState("");
  const [includeDraft, setIncludeDraft] = useState<ConditionDraft>({ key: "", value: "" });
  const [excludeDraft, setExcludeDraft] = useState<ConditionDraft>({ key: "", value: "" });
  const [conditionDrafts, setConditionDrafts] = useState<Record<string, ConditionDraft>>({});

  useEffect(() => {
    setNameDraft(selectedQuery?.name ?? "");
    setConditionDrafts(
      Object.fromEntries(
        [
          ...(selectedQuery?.includeTags ?? []),
          ...(selectedQuery?.excludeTags ?? [])
        ].map((condition) => [condition.id, { key: condition.key, value: condition.value }])
      )
    );
  }, [selectedQuery]);

  function addCondition(list: "includeTags" | "excludeTags", draft: ConditionDraft) {
    if (!selectedQuery || !draft.key.trim()) return;
    onAddCondition(selectedQuery.id, list, draft.key, draft.value);
    if (list === "includeTags") setIncludeDraft({ key: "", value: "" });
    else setExcludeDraft({ key: "", value: "" });
  }

  return (
    <section className="atlas-panel atlas-query-builder" aria-label="Query builder">
      <header>
        <p className="atlas-eyebrow">Queries</p>
        <h2>Tag Query Builder</h2>
      </header>

      <div className="atlas-query-toolbar">
        <button type="button" onClick={onCreateQuery}>
          New query
        </button>
        <select
          value={selectedQueryId ?? ""}
          onChange={(event) => onSelectQuery(event.target.value || null)}
          aria-label="Selected query"
        >
          <option value="">No query selected</option>
          {queries.map((query) => (
            <option key={query.id} value={query.id}>
              {query.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedQuery ? (
        <p className="atlas-muted">
          Create a named query to select cards by typed tags such as type=product.
        </p>
      ) : (
        <div className="atlas-query-editor">
          <label>
            <span>Name</span>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              onBlur={() => onUpdateQuery(selectedQuery.id, nameDraft)}
              aria-label="Query name"
            />
          </label>

          <QueryConditionSection
            title="Include tags"
            list="includeTags"
            query={selectedQuery}
            drafts={conditionDrafts}
            newDraft={includeDraft}
            onNewDraftChange={setIncludeDraft}
            onAdd={() => addCondition("includeTags", includeDraft)}
            onDraftChange={setConditionDrafts}
            onSave={onUpdateCondition}
            onDelete={onDeleteCondition}
          />

          <QueryConditionSection
            title="Exclude tags"
            list="excludeTags"
            query={selectedQuery}
            drafts={conditionDrafts}
            newDraft={excludeDraft}
            onNewDraftChange={setExcludeDraft}
            onAdd={() => addCondition("excludeTags", excludeDraft)}
            onDraftChange={setConditionDrafts}
            onSave={onUpdateCondition}
            onDelete={onDeleteCondition}
          />

          <div className="atlas-query-results" aria-live="polite">
            <strong>{matches.length} matching cards</strong>
            {matches.length === 0 ? (
              <p className="atlas-muted">No cards match this query.</p>
            ) : (
              <ul>
                {matches.map((card) => (
                  <li key={card.id}>{card.title}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="atlas-query-actions">
            <button type="button" onClick={() => onDuplicateQuery(selectedQuery.id)}>
              Duplicate
            </button>
            <button type="button" onClick={() => onDeleteQuery(selectedQuery.id)}>
              Delete query
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

type QueryConditionSectionProps = {
  title: string;
  list: "includeTags" | "excludeTags";
  query: AtlasCardQuery;
  drafts: Record<string, ConditionDraft>;
  newDraft: ConditionDraft;
  onNewDraftChange: (draft: ConditionDraft) => void;
  onAdd: () => void;
  onDraftChange: (updater: (current: Record<string, ConditionDraft>) => Record<string, ConditionDraft>) => void;
  onSave: (
    queryId: string,
    list: "includeTags" | "excludeTags",
    conditionId: string,
    key: string,
    value: string
  ) => void;
  onDelete: (
    queryId: string,
    list: "includeTags" | "excludeTags",
    conditionId: string
  ) => void;
};

function QueryConditionSection({
  title,
  list,
  query,
  drafts,
  newDraft,
  onNewDraftChange,
  onAdd,
  onDraftChange,
  onSave,
  onDelete
}: QueryConditionSectionProps) {
  return (
    <section className="atlas-query-condition-section">
      <h3>{title}</h3>
      <div className="atlas-query-condition-row">
        <input
          value={newDraft.key}
          onChange={(event) => onNewDraftChange({ ...newDraft, key: event.target.value })}
          placeholder="key"
          aria-label={`${title} key`}
        />
        <input
          value={newDraft.value}
          onChange={(event) => onNewDraftChange({ ...newDraft, value: event.target.value })}
          placeholder="value"
          aria-label={`${title} value`}
        />
        <button type="button" onClick={onAdd}>
          Add
        </button>
      </div>

      {query[list].map((condition) => {
        const draft = drafts[condition.id] ?? { key: condition.key, value: condition.value };

        return (
          <div key={condition.id} className="atlas-query-condition-row">
            <input
              value={draft.key}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  [condition.id]: { ...draft, key: event.target.value }
                }))
              }
              aria-label={`${title} condition key`}
            />
            <input
              value={draft.value}
              onChange={(event) =>
                onDraftChange((current) => ({
                  ...current,
                  [condition.id]: { ...draft, value: event.target.value }
                }))
              }
              aria-label={`${title} condition value`}
            />
            <button
              type="button"
              onClick={() => onSave(query.id, list, condition.id, draft.key, draft.value)}
            >
              Save
            </button>
            <button type="button" onClick={() => onDelete(query.id, list, condition.id)}>
              Remove
            </button>
          </div>
        );
      })}
    </section>
  );
}
