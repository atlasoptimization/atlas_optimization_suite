import { useEffect, useMemo, useState } from "react";
import { DOMAIN_ORDER } from "../../core/constants/domains";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { DomainName } from "../../core/types/domain";
import type { Pile } from "../../core/types/session";
import {
  buildDrawSubset,
  getAvailableCardsForDrawSubset,
  type DrawSubsetKind
} from "../../engine/draw/drawSelection";

export type CustomDrawSource = {
  id: string;
  domain: string;
  subsetKind: Exclude<DrawSubsetKind, "specific-subdomain">;
  count: number;
};

export type CustomDrawRecipe = {
  name: string;
  sources: CustomDrawSource[];
};

type CustomDrawDialogProps = {
  cards: DeckCard[];
  piles: Pile[];
  initialRecipe?: CustomDrawRecipe | null;
  onDispatchAction: (action: DeckAction) => void;
  onSaveLastRecipe: (recipe: CustomDrawRecipe) => void;
  onClose: () => void;
};

const subsetOptions: Array<{
  value: CustomDrawSource["subsetKind"];
  label: string;
}> = [
  { value: "full-domain", label: "Full domain" },
  { value: "domain-masters", label: "Domain master cards only" },
  { value: "subdomain-masters", label: "Subdomain master cards only" },
  { value: "domain-and-subdomain-masters", label: "Domain + subdomain master cards" }
];

export function makeTwoEachCanonicalRecipe(): CustomDrawRecipe {
  return {
    name: "Two from each canonical domain",
    sources: DOMAIN_ORDER.map((domain) => ({
      id: `source-${domain}`,
      domain,
      subsetKind: "full-domain",
      count: 2
    }))
  };
}

export function buildCustomDrawCandidateRefs(
  recipe: CustomDrawRecipe,
  cards: DeckCard[],
  piles: Pile[]
) {
  const seen = new Set<string>();
  return recipe.sources.flatMap((source) => {
    const subset = buildDrawSubset(source.subsetKind, source.domain as DomainName, "");
    const available = getAvailableCardsForDrawSubset(cards, piles, subset)
      .filter((card) => !seen.has(card.id))
      .slice(0, Math.max(0, source.count));

    for (const card of available) seen.add(card.id);
    return available.map((card) => ({ cardId: card.id, domain: card.domain }));
  });
}

export function CustomDrawDialog({
  cards,
  piles,
  initialRecipe,
  onDispatchAction,
  onSaveLastRecipe,
  onClose
}: CustomDrawDialogProps) {
  const domains = useMemo(
    () => [...new Set(piles.map((pile) => pile.domain).filter((domain): domain is string => Boolean(domain)))],
    [piles]
  );
  const [recipeName, setRecipeName] = useState(initialRecipe?.name ?? "Custom draw");
  const [sources, setSources] = useState<CustomDrawSource[]>(
    initialRecipe?.sources ?? makeTwoEachCanonicalRecipe().sources
  );
  const recipe = useMemo(
    () => ({
      name: recipeName.trim() || "Custom draw",
      sources
    }),
    [recipeName, sources]
  );
  const candidates = useMemo(
    () => buildCustomDrawCandidateRefs(recipe, cards, piles),
    [cards, piles, recipe]
  );

  useEffect(() => {
    if (domains.length === 0) return;
    setSources((current) =>
      current.map((source) =>
        domains.includes(source.domain) ? source : { ...source, domain: domains[0] }
      )
    );
  }, [domains]);

  function updateSource(id: string, patch: Partial<CustomDrawSource>) {
    setSources((current) =>
      current.map((source) => (source.id === id ? { ...source, ...patch } : source))
    );
  }

  function submit() {
    if (candidates.length === 0) return;
    onSaveLastRecipe(recipe);
    onDispatchAction({
      type: "draw.startFilteredChoice",
      cards: candidates
    });
    onClose();
  }

  return (
    <section className="draw-dialog custom-draw-dialog" data-testid="custom-draw-dialog">
      <p className="muted">
        Combine several filtered draws into one candidate pool. Choose one card; unchosen cards go to their source discard piles.
      </p>
      <label>
        Recipe name
        <input value={recipeName} onChange={(event) => setRecipeName(event.target.value)} />
      </label>
      <div className="custom-draw-sources">
        {sources.map((source, index) => (
          <div className="custom-draw-source-row" key={source.id}>
            <span>{index + 1}</span>
            <label>
              Domain
              <select
                value={source.domain}
                onChange={(event) => updateSource(source.id, { domain: event.target.value })}
              >
                {domains.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subset/filter
              <select
                value={source.subsetKind}
                onChange={(event) =>
                  updateSource(source.id, {
                    subsetKind: event.target.value as CustomDrawSource["subsetKind"]
                  })
                }
              >
                {subsetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cards
              <input
                type="number"
                min={1}
                max={24}
                value={source.count}
                onChange={(event) =>
                  updateSource(source.id, {
                    count: Math.max(1, Number.parseInt(event.target.value, 10) || 1)
                  })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setSources((current) => current.filter((candidate) => candidate.id !== source.id))
              }
              disabled={sources.length === 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <div className="custom-draw-actions">
        <button
          type="button"
          onClick={() =>
            setSources((current) => [
              ...current,
              {
                id: `source-${Date.now()}-${current.length}`,
                domain: domains[0] ?? "Source",
                subsetKind: "full-domain",
                count: 1
              }
            ])
          }
        >
          Add source
        </button>
        <button
          type="button"
          onClick={() => {
            const preset = makeTwoEachCanonicalRecipe();
            setRecipeName(preset.name);
            setSources(preset.sources);
          }}
        >
          2 from each domain
        </button>
      </div>
      <p className="muted">{candidates.length} candidates available for the combined pool.</p>
      <button type="button" onClick={submit} disabled={candidates.length === 0}>
        Draw combined candidate pool
      </button>
      <button type="button" disabled title="Recipe library saving is coming later. The last recipe can be repeated this session.">
        Save recipe library (coming later)
      </button>
    </section>
  );
}
