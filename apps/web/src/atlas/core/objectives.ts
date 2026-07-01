import { getFunctionDependencySummary } from "./functions";
import type {
  AtlasCard,
  AtlasCardQuery,
  AtlasObjectiveConfig,
  AtlasObjectiveTerm,
  AtlasWorkbenchState
} from "./types";

export function createObjectiveConfig(
  options: Partial<AtlasObjectiveConfig> = {}
): AtlasObjectiveConfig {
  return {
    direction: options.direction ?? "minimize",
    terms: options.terms?.map(copyObjectiveTerm) ?? []
  };
}

export function createObjectiveTerm(
  functionCardId: string | null = null,
  options: { id?: string; name?: string } = {}
): AtlasObjectiveTerm {
  return {
    id: options.id ?? makeModelId("term"),
    name: options.name?.trim() || "Objective term",
    functionCardId
  };
}

export function updateObjectiveConfig(
  state: AtlasWorkbenchState,
  cardId: string,
  patch: Partial<Pick<AtlasObjectiveConfig, "direction">>
): AtlasWorkbenchState {
  return updateObjectiveCard(state, cardId, (objective) => ({
    ...objective,
    ...patch
  }));
}

export function addObjectiveTerm(
  state: AtlasWorkbenchState,
  cardId: string,
  functionCardId: string | null = null
) {
  return updateObjectiveCard(state, cardId, (objective) => ({
    ...objective,
    terms: [
      ...objective.terms,
      createObjectiveTerm(functionCardId, {
        name: `Term ${objective.terms.length + 1}`
      })
    ]
  }));
}

export function updateObjectiveTerm(
  state: AtlasWorkbenchState,
  cardId: string,
  termId: string,
  name: string,
  functionCardId: string | null
) {
  return updateObjectiveCard(state, cardId, (objective) => ({
    ...objective,
    terms: objective.terms.map((term) =>
      term.id === termId
        ? {
            ...term,
            name: name.trim() || "Objective term",
            functionCardId
          }
        : term
    )
  }));
}

export function removeObjectiveTerm(
  state: AtlasWorkbenchState,
  cardId: string,
  termId: string
) {
  return updateObjectiveCard(state, cardId, (objective) => ({
    ...objective,
    terms: objective.terms.filter((term) => term.id !== termId)
  }));
}

export function moveObjectiveTerm(
  state: AtlasWorkbenchState,
  cardId: string,
  termId: string,
  direction: "up" | "down"
) {
  return updateObjectiveCard(state, cardId, (objective) => {
    const index = objective.terms.findIndex((term) => term.id === termId);
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || nextIndex < 0 || nextIndex >= objective.terms.length) return objective;
    const terms = [...objective.terms];
    [terms[index], terms[nextIndex]] = [terms[nextIndex], terms[index]];
    return { ...objective, terms };
  });
}

export function objectivePreview(card: AtlasCard, cards: AtlasCard[]) {
  const objective = createObjectiveConfig(card.objective);
  const functionNames = objective.terms.map((term) => {
    const functionCard = term.functionCardId
      ? cards.find((candidate) => candidate.id === term.functionCardId || candidate.modelObjectId === term.functionCardId)
      : null;
    return functionCard?.title ?? "Unassigned function";
  });

  return {
    directionLabel: objective.direction === "minimize" ? "Minimize" : "Maximize",
    termCount: objective.terms.length,
    functionNames
  };
}

export function getObjectiveDependencySummary(
  card: AtlasCard,
  cards: AtlasCard[],
  queries: AtlasCardQuery[],
  options: { termId?: string | null } = {}
) {
  const objective = createObjectiveConfig(card.objective);
  const terms = options.termId
    ? objective.terms.filter((term) => term.id === options.termId)
    : objective.terms;
  const functionCards = terms
    .map((term) =>
      term.functionCardId
        ? cards.find(
            (candidate) =>
              (candidate.id === term.functionCardId || candidate.modelObjectId === term.functionCardId) &&
              candidate.type === "function"
          ) ?? null
        : null
    )
    .filter((functionCard): functionCard is AtlasCard => functionCard !== null);
  const participatingCards = uniqueCards(
    functionCards.flatMap((functionCard) =>
      getFunctionDependencySummary(functionCard, queries, cards).matchedCards
    )
  );

  return {
    terms,
    functionCards,
    participatingCards
  };
}

function updateObjectiveCard(
  state: AtlasWorkbenchState,
  cardId: string,
  update: (objective: AtlasObjectiveConfig) => AtlasObjectiveConfig
) {
  return {
    ...state,
    cards: state.cards.map((card) =>
      card.id === cardId && card.type === "objective"
        ? { ...card, objective: update(createObjectiveConfig(card.objective)) }
        : card
    )
  };
}

function copyObjectiveTerm(term: AtlasObjectiveTerm): AtlasObjectiveTerm {
  return {
    id: term.id,
    name: term.name,
    functionCardId: term.functionCardId ?? null
  };
}

function uniqueCards(cards: AtlasCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

function makeModelId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
