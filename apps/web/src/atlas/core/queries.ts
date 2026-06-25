import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasTagCondition,
  AtlasWorkbenchState
} from "./types";

export function createAtlasQuery(
  options: Partial<Pick<AtlasCardQuery, "id" | "name" | "includeTags" | "excludeTags">> = {}
): AtlasCardQuery {
  return {
    id: options.id ?? makeAtlasId("query"),
    name: options.name ?? "New query",
    includeTags: options.includeTags ?? [],
    excludeTags: options.excludeTags ?? []
  };
}

export function createAtlasTagCondition(
  key: string,
  value: string,
  id = makeAtlasId("condition")
): AtlasTagCondition {
  return {
    id,
    key: key.trim(),
    value: value.trim()
  };
}

export function addAtlasQuery(state: AtlasWorkbenchState, id?: string): AtlasWorkbenchState {
  const query = createAtlasQuery({ id });

  return {
    ...state,
    queries: [...state.queries, query],
    selectedCardId: null,
    selectedGroupId: null,
    selectedQueryId: query.id
  };
}

export function updateAtlasQuery(
  state: AtlasWorkbenchState,
  queryId: string,
  patch: Partial<Pick<AtlasCardQuery, "name">>
): AtlasWorkbenchState {
  return {
    ...state,
    queries: state.queries.map((query) =>
      query.id === queryId
        ? { ...query, name: patch.name?.trim() || query.name }
        : query
    )
  };
}

export function duplicateAtlasQuery(state: AtlasWorkbenchState, queryId: string): AtlasWorkbenchState {
  const source = state.queries.find((query) => query.id === queryId);
  if (!source) return state;
  const duplicate = createAtlasQuery({
    name: `${source.name} copy`,
    includeTags: source.includeTags.map((condition) =>
      createAtlasTagCondition(condition.key, condition.value)
    ),
    excludeTags: source.excludeTags.map((condition) =>
      createAtlasTagCondition(condition.key, condition.value)
    )
  });

  return {
    ...state,
    queries: [...state.queries, duplicate],
    selectedCardId: null,
    selectedGroupId: null,
    selectedQueryId: duplicate.id
  };
}

export function deleteAtlasQuery(state: AtlasWorkbenchState, queryId: string): AtlasWorkbenchState {
  return {
    ...state,
    queries: state.queries.filter((query) => query.id !== queryId),
    selectedQueryId: state.selectedQueryId === queryId ? null : state.selectedQueryId
  };
}

export function addAtlasQueryCondition(
  state: AtlasWorkbenchState,
  queryId: string,
  list: "includeTags" | "excludeTags",
  key: string,
  value: string
): AtlasWorkbenchState {
  const condition = createAtlasTagCondition(key, value);

  return {
    ...state,
    queries: state.queries.map((query) =>
      query.id === queryId ? { ...query, [list]: [...query[list], condition] } : query
    )
  };
}

export function updateAtlasQueryCondition(
  state: AtlasWorkbenchState,
  queryId: string,
  list: "includeTags" | "excludeTags",
  conditionId: string,
  key: string,
  value: string
): AtlasWorkbenchState {
  const nextCondition = createAtlasTagCondition(key, value, conditionId);

  return {
    ...state,
    queries: state.queries.map((query) =>
      query.id === queryId
        ? {
            ...query,
            [list]: query[list].map((condition) =>
              condition.id === conditionId ? nextCondition : condition
            )
          }
        : query
    )
  };
}

export function deleteAtlasQueryCondition(
  state: AtlasWorkbenchState,
  queryId: string,
  list: "includeTags" | "excludeTags",
  conditionId: string
): AtlasWorkbenchState {
  return {
    ...state,
    queries: state.queries.map((query) =>
      query.id === queryId
        ? {
            ...query,
            [list]: query[list].filter((condition) => condition.id !== conditionId)
          }
        : query
    )
  };
}

export function evaluateAtlasQuery(query: AtlasCardQuery, cards: AtlasCard[]) {
  return cards.filter((card) => cardMatchesQuery(card, query));
}

export function cardMatchesQuery(card: AtlasCard, query: AtlasCardQuery) {
  const includeMatches = query.includeTags.every((condition) =>
    conditionIsEmpty(condition) ? true : cardHasTag(card, condition)
  );
  if (!includeMatches) return false;

  return !query.excludeTags.some((condition) =>
    conditionIsEmpty(condition) ? false : cardHasTag(card, condition)
  );
}

export function getSelectedAtlasQuery(state: AtlasWorkbenchState) {
  return state.queries.find((query) => query.id === state.selectedQueryId) ?? null;
}

function cardHasTag(card: AtlasCard, condition: AtlasTagCondition) {
  return card.tags.some((tag) => tag.key === condition.key && tag.value === condition.value);
}

function conditionIsEmpty(condition: AtlasTagCondition) {
  return !condition.key.trim();
}

function makeAtlasId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
