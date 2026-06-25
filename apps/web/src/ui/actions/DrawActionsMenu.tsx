import { DOMAIN_ORDER } from "../../core/constants/domains";
import { promptForDrawCount } from "./drawActionHandlers";

type DrawActionsMenuProps = {
  onDrawNext: () => void;
  onDrawDomain: (domain: string) => void;
  onDrawDomainMany: (domain: string, count: number) => void;
  onChooseOneFromN: (domain: string, count: number) => void;
};

export function DrawActionsMenu({
  onDrawNext,
  onDrawDomain,
  onDrawDomainMany,
  onChooseOneFromN
}: DrawActionsMenuProps) {
  return (
    <div className="action-menu-panel">
      <button type="button" onClick={onDrawNext}>
        Next in cycle
      </button>

      {DOMAIN_ORDER.map((domain) => (
        <details key={domain} className="action-submenu">
          <summary>{domain}</summary>
          <button type="button" onClick={() => onDrawDomain(domain)}>
            Random 1
          </button>
          <button
            type="button"
            onClick={() => {
              const count = promptForDrawCount(domain);
              if (count) onDrawDomainMany(domain, count);
            }}
          >
            Random N
          </button>
          <button
            type="button"
            onClick={() => {
              const count = promptForDrawCount(domain);
              if (count) onChooseOneFromN(domain, count);
            }}
          >
            Choose 1 from N
          </button>
        </details>
      ))}
    </div>
  );
}
