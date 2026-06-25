import type { DiscoveredCustomDomain } from "../../customDomains/discoveredCustomDomains";

type CustomDomainManagerProps = {
  domains: DiscoveredCustomDomain[];
  activeDomainIds: string[];
  onToggleDomain: (domainId: string, enabled: boolean) => void;
};

export function CustomDomainManager({
  domains,
  activeDomainIds,
  onToggleDomain
}: CustomDomainManagerProps) {
  const active = new Set(activeDomainIds);

  return (
    <section className="custom-domain-manager">
      <h2>Custom Domains</h2>
      <p className="muted">
        Synced custom domains are optional content packs. Enable a domain to add it to
        the browser, search, and pile bar.
      </p>

      {domains.length === 0 ? (
        <p className="muted">
          No custom domains were discovered. Add a folder under custom_domains and run pnpm sync:assets.
        </p>
      ) : (
        <div className="custom-domain-manager-list">
          {domains.map((domain) => {
            const enabled = active.has(domain.id);

            return (
              <article key={domain.id} className="custom-domain-manager-card">
                <header>
                  <div>
                    <h3>{domain.name}</h3>
                    <p>{domain.folder ?? domain.id}</p>
                  </div>
                  <span className={enabled ? "status-badge active" : "status-badge"}>
                    {enabled ? "active" : "inactive"}
                  </span>
                </header>
                <dl>
                  <div>
                    <dt>Cards</dt>
                    <dd>{domain.cardCount}</dd>
                  </div>
                  <div>
                    <dt>PDFs</dt>
                    <dd>{domain.pdfCount}</dd>
                  </div>
                  <div>
                    <dt>Previews</dt>
                    <dd>{domain.previewCount}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={() => onToggleDomain(domain.id, !enabled)}
                >
                  {enabled ? "Disable" : "Enable"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      <p className="muted">
        Sync discovers domains; activation is local to this browser. Existing placed
        cards remain visible even if their source domain is disabled.
      </p>
    </section>
  );
}
