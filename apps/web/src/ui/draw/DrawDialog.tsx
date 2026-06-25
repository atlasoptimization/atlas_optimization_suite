import { useEffect, useMemo, useState } from "react";
import { DOMAIN_ORDER } from "../../core/constants/domains";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { DomainName } from "../../core/types/domain";
import type { Pile } from "../../core/types/session";
import { modeUsesCount, type DrawMode } from "../../engine/draw/drawModes";
import {
  buildDrawSubset,
  createFilteredDrawAction,
  getAvailableCardsForDrawSubset,
  type DrawSubsetKind
} from "../../engine/draw/drawSelection";
import { getSubdomainsForDomain } from "../../engine/draw/drawSubsets";

type DrawDialogProps = {
  cards: DeckCard[];
  piles: Pile[];
  onDispatchAction: (action: DeckAction) => void;
  onClose: () => void;
};

export function DrawDialog({ cards, piles, onDispatchAction, onClose }: DrawDialogProps) {
  const [domain, setDomain] = useState<DomainName>("Source");
  const [subsetKind, setSubsetKind] = useState<DrawSubsetKind>("full-domain");
  const [mode, setMode] = useState<DrawMode>("random-1");
  const [count, setCount] = useState(3);
  const subdomains = useMemo(() => getSubdomainsForDomain(cards, domain), [cards, domain]);
  const [subdomain, setSubdomain] = useState(subdomains[0] ?? "");
  const subset = buildDrawSubset(subsetKind, domain, subdomain || subdomains[0] || "");
  const availableCards = useMemo(
    () => getAvailableCardsForDrawSubset(cards, piles, subset),
    [cards, piles, subset]
  );
  const drawCount = modeUsesCount(mode) ? count : 1;

  useEffect(() => {
    if (!subdomains.includes(subdomain)) setSubdomain(subdomains[0] ?? "");
  }, [subdomain, subdomains]);

  function submit() {
    const action = createFilteredDrawAction(availableCards, mode, drawCount);
    if (!action) return;
    onDispatchAction(action);

    onClose();
  }

  return (
    <section className="draw-dialog" data-testid="draw-dialog">
      <label>
        Domain
        <select value={domain} onChange={(event) => setDomain(event.target.value as DomainName)}>
          {DOMAIN_ORDER.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
      </label>

      <label>
        Draw subset
        <select value={subsetKind} onChange={(event) => setSubsetKind(event.target.value as DrawSubsetKind)}>
          <option value="full-domain">Full domain</option>
          <option value="domain-masters">Domain master cards only</option>
          <option value="subdomain-masters">Subdomain master cards only</option>
          <option value="domain-and-subdomain-masters">Domain + subdomain master cards</option>
          <option value="specific-subdomain">Specific subdomain</option>
        </select>
      </label>

      {subsetKind === "specific-subdomain" && (
        <label>
          Subdomain
          <select value={subdomain} onChange={(event) => setSubdomain(event.target.value)}>
            {subdomains.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        Draw mode
        <select value={mode} onChange={(event) => setMode(event.target.value as DrawMode)}>
          <option value="random-1">Random 1</option>
          <option value="random-n">Random N</option>
          <option value="choose-1-from-n">Choose 1 from N</option>
          <option value="secret-1">Secret 1</option>
          <option value="secret-n">Secret N</option>
        </select>
      </label>

      {modeUsesCount(mode) && (
        <label>
          N
          <input
            type="number"
            min={1}
            max={Math.max(1, availableCards.length)}
            value={count}
            onChange={(event) => setCount(Math.max(1, Number.parseInt(event.target.value, 10) || 1))}
          />
        </label>
      )}

      <p className="muted">{availableCards.length} cards available in this subset.</p>
      <button type="button" onClick={submit} disabled={availableCards.length === 0}>
        Draw
      </button>
    </section>
  );
}
