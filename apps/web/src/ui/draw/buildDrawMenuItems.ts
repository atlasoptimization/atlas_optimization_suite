import { DOMAIN_ORDER } from "../../core/constants/domains";
import type { DeckAction } from "../../core/types/action";
import type { DeckCard } from "../../core/types/card";
import type { DomainName } from "../../core/types/domain";
import type { Pile } from "../../core/types/session";
import type { DrawMode } from "../../engine/draw/drawModes";
import {
  buildDomainDrawSubset,
  createFilteredDrawAction,
  getAvailableCardsForDrawSubset,
  type DrawSubsetKind
} from "../../engine/draw/drawSelection";
import { getSubdomainsForDomain } from "../../engine/draw/drawSubsets";
import type { ContextMenuItem } from "../context-menu/contextMenuTypes";

type DrawMenuCallbacks = {
  promptForCount: (domain: string, label: string) => number | null;
  dispatchAction: (action: DeckAction) => void;
};

type DrawModeSpec = {
  mode: DrawMode;
  label: string;
  countPrompt?: string;
};

const fullDrawModes: DrawModeSpec[] = [
  { mode: "random-1", label: "Random 1" },
  { mode: "random-n", label: "Random N", countPrompt: "Draw how many cards?" },
  { mode: "choose-1-from-n", label: "Choose 1 from N", countPrompt: "Choose 1 from how many candidates?" },
  { mode: "secret-1", label: "Secret 1" },
  { mode: "secret-n", label: "Secret N", countPrompt: "Draw how many secret cards?" }
];

const singleCardDrawModes: DrawModeSpec[] = [
  { mode: "random-1", label: "Random 1" },
  { mode: "choose-1-from-n", label: "Choose 1 from N", countPrompt: "Choose 1 from how many candidates?" },
  { mode: "secret-1", label: "Secret 1" }
];

export function buildDomainFilteredDrawMenuItems({
  domain,
  cards,
  piles,
  callbacks
}: {
  domain: string;
  cards: DeckCard[];
  piles: Pile[];
  callbacks: DrawMenuCallbacks;
}): ContextMenuItem {
  const domainName = toDomainName(domain);
  if (!domainName) {
    return {
      id: "draw-unavailable",
      label: "Draw unavailable",
      enabled: false
    };
  }

  const subdomains = getSubdomainsForDomain(cards, domainName);

  return {
    id: "draw",
    label: "Draw",
    children: [
      buildSubsetMenu({
        id: "draw-full-domain",
        label: "Full domain",
        domain: domainName,
        subsetKind: "full-domain",
        cards,
        piles,
        callbacks,
        modes: fullDrawModes
      }),
      {
        id: "draw-masters",
        label: "Masters",
        children: [
          buildSubsetMenu({
            id: "draw-domain-master",
            label: "Domain master only",
            domain: domainName,
            subsetKind: "domain-masters",
            cards,
            piles,
            callbacks,
            modes: singleCardDrawModes
          }),
          buildSubsetMenu({
            id: "draw-subdomain-masters",
            label: "Subdomain masters only",
            domain: domainName,
            subsetKind: "subdomain-masters",
            cards,
            piles,
            callbacks,
            modes: fullDrawModes
          }),
          buildSubsetMenu({
            id: "draw-all-masters",
            label: "Domain + subdomain masters",
            domain: domainName,
            subsetKind: "domain-and-subdomain-masters",
            cards,
            piles,
            callbacks,
            modes: fullDrawModes
          })
        ]
      },
      {
        id: "draw-specific-subdomain",
        label: "Specific subdomain",
        enabled: subdomains.length > 0,
        children:
          subdomains.length > 0
            ? subdomains.map((subdomain) =>
                buildSubsetMenu({
                  id: `draw-subdomain-${slugId(subdomain)}`,
                  label: subdomain,
                  domain: domainName,
                  subdomain,
                  subsetKind: "specific-subdomain",
                  cards,
                  piles,
                  callbacks,
                  modes: fullDrawModes
                })
              )
            : [
                {
                  id: "draw-no-subdomains",
                  label: "No subdomains available",
                  enabled: false
                }
              ]
      }
    ]
  };
}

function buildSubsetMenu({
  id,
  label,
  domain,
  subdomain,
  subsetKind,
  cards,
  piles,
  callbacks,
  modes
}: {
  id: string;
  label: string;
  domain: DomainName;
  subdomain?: string;
  subsetKind: DrawSubsetKind;
  cards: DeckCard[];
  piles: Pile[];
  callbacks: DrawMenuCallbacks;
  modes: DrawModeSpec[];
}): ContextMenuItem {
  const subset = buildDomainDrawSubset(subsetKind, domain, subdomain);
  const availableCards = getAvailableCardsForDrawSubset(cards, piles, subset);

  return {
    id,
    label,
    enabled: availableCards.length > 0,
    children:
      availableCards.length > 0
        ? modes.map((modeSpec) =>
            buildDrawModeItem({
              domain,
              availableCards,
              callbacks,
              modeSpec
            })
          )
        : [
            {
              id: `${id}-empty`,
              label: "No cards available",
              enabled: false
            }
          ]
  };
}

function buildDrawModeItem({
  domain,
  availableCards,
  callbacks,
  modeSpec
}: {
  domain: DomainName;
  availableCards: DeckCard[];
  callbacks: DrawMenuCallbacks;
  modeSpec: DrawModeSpec;
}): ContextMenuItem {
  return {
    id: `draw-${modeSpec.mode}`,
    label: modeSpec.label,
    enabled: availableCards.length > 0,
    onClick: () => {
      const count = modeSpec.countPrompt
        ? callbacks.promptForCount(domain, modeSpec.countPrompt)
        : 1;
      if (!count) return;

      const action = createFilteredDrawAction(availableCards, modeSpec.mode, count);
      if (action) callbacks.dispatchAction(action);
    }
  };
}

function toDomainName(domain: string): DomainName | null {
  return DOMAIN_ORDER.includes(domain as DomainName) ? (domain as DomainName) : null;
}

function slugId(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
}
