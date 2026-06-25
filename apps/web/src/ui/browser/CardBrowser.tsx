import { useEffect, useState } from "react";
import type { FeatureConfig } from "../../config/features";
import type { CustomCard, DeckCard, DeckManifest } from "../../core/types/card";
import type { CardNameMode } from "../../core/types/view";
import { domainClass } from "../../core/constants/domains";
import type { DiscoveredCustomDomain } from "../../customDomains/discoveredCustomDomains";
import {
  getCustomDomainsFolderPath,
  getCustomDomainsSyncCommand
} from "../../customDomains/customDomainInstructions";
import { getCardsForDomain } from "../../engine/selectors";
import type { CustomCardInput } from "../../storage/localCustomCardsStorage";
import { CustomCardEditor } from "../custom-cards/CustomCardEditor";
import { CustomCardList } from "../custom-cards/CustomCardList";
import {
  getCardDisplayName,
  getCardNameModeFromToggles,
  groupCardsByDomainAndSubdomain
} from "./cardBrowserHelpers";

type CardBrowserProps = {
  manifest: DeckManifest;
  selectedDomain: string;
  onSelectedDomainChange: (domain: string) => void;
  onPlaceCard: (card: DeckCard) => void;
  showMythicNames: boolean;
  showScientificNames: boolean;
  showKeywords: boolean;
  showCustomAssets: boolean;
  customCards: CustomCard[];
  discoveredCustomDomains: DiscoveredCustomDomain[];
  activeCustomDomainIds: string[];
  onCreateCustomCard: (input: CustomCardInput) => void;
  onUpdateCustomCard: (card: CustomCard, input: CustomCardInput) => void;
  onDeleteCustomCard: (cardId: string) => void;
  onImportCustomCardsCsv: (file: File) => void;
  onExportCustomCardsCsv: () => void;
  onImportCustomCardsJson: (file: File) => void;
  onExportCustomCardsJson: () => void;
  onManageCustomDomains: () => void;
  onOpenCustomDomainsHelp: () => void;
  features: FeatureConfig;
};

export function CardBrowser({
  manifest,
  selectedDomain,
  onSelectedDomainChange,
  onPlaceCard,
  showMythicNames,
  showScientificNames,
  showKeywords,
  showCustomAssets,
  customCards,
  discoveredCustomDomains,
  activeCustomDomainIds,
  onCreateCustomCard,
  onUpdateCustomCard,
  onDeleteCustomCard,
  onImportCustomCardsCsv,
  onExportCustomCardsCsv,
  onImportCustomCardsJson,
  onExportCustomCardsJson,
  onManageCustomDomains,
  onOpenCustomDomainsHelp,
  features
}: CardBrowserProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());
  const [customCardsOpen, setCustomCardsOpen] = useState(customCards.length > 0);
  const [customDomainsOpen, setCustomDomainsOpen] = useState(discoveredCustomDomains.length > 0);
  const [customEditorOpen, setCustomEditorOpen] = useState(false);
  const [editingCustomCard, setEditingCustomCard] = useState<CustomCard | null>(null);
  const [discoverInstructionsOpen, setDiscoverInstructionsOpen] = useState(false);
  const [cardNameMode, setCardNameMode] = useState<CardNameMode>(
    getCardNameModeFromToggles(showMythicNames, showScientificNames)
  );
  const filteredCards = getCardsForDomain(manifest.cards, selectedDomain);
  const groups = groupCardsByDomainAndSubdomain(filteredCards);

  useEffect(() => {
    setCardNameMode(getCardNameModeFromToggles(showMythicNames, showScientificNames));
  }, [showMythicNames, showScientificNames]);

  function toggleDomain(domain: string) {
    setExpandedDomains((old) => toggleSetValue(old, domain));
  }

  function toggleSubdomain(domain: string, subdomain: string) {
    setExpandedSubdomains((old) => toggleSetValue(old, `${domain}:${subdomain}`));
  }

  return (
    <aside className="left-panel">
      <h2>Card Browser</h2>

      <div className="browser-controls">
        <label>
          Domain
          <select
            value={selectedDomain}
            onChange={(event) => onSelectedDomainChange(event.target.value)}
          >
            <option>All</option>
            {manifest.domains.map((domain) => (
              <option key={domain}>{domain}</option>
            ))}
          </select>
        </label>

        <label>
          Names
          <select
            value={cardNameMode}
            onChange={(event) => setCardNameMode(event.target.value as CardNameMode)}
          >
            <option value="mythic">Mythic names</option>
            <option value="scientific">Scientific names</option>
            <option value="both">Both</option>
          </select>
        </label>
      </div>

      <div className="browser-tree">
        {groups.map((group) => {
          const domainExpanded = expandedDomains.has(group.domain);

          return (
            <section key={group.domain} className="browser-domain-group">
              <button
                type="button"
                className="browser-group-header"
                onClick={() => toggleDomain(group.domain)}
              >
                <strong>{group.domain}</strong>
                <span>{group.count}</span>
              </button>

              {domainExpanded && (
                <>
                  {group.domainMasterCards.length > 0 && (
                    <div className="card-list browser-domain-master-list">
                      {group.domainMasterCards.map((card) => (
                        <BrowserCardButton
                          key={card.id}
                          card={card}
                          cardNameMode={cardNameMode}
                          showKeywords={showKeywords}
                          onPlaceCard={onPlaceCard}
                        />
                      ))}
                    </div>
                  )}

                  {group.subdomains.map((subdomainGroup) => {
                    const subdomainKey = `${group.domain}:${subdomainGroup.subdomain}`;
                    const subdomainExpanded = expandedSubdomains.has(subdomainKey);

                    return (
                      <section key={subdomainKey} className="browser-subdomain-group">
                        <button
                          type="button"
                          className="browser-subgroup-header"
                          onClick={() =>
                            toggleSubdomain(group.domain, subdomainGroup.subdomain)
                          }
                        >
                          <span>{subdomainGroup.subdomain}</span>
                          <span>{subdomainGroup.count}</span>
                        </button>

                        {subdomainExpanded && (
                          <div className="card-list">
                            {[...subdomainGroup.masterCards, ...subdomainGroup.cards].map((card) => (
                              <BrowserCardButton
                                key={card.id}
                                card={card}
                                cardNameMode={cardNameMode}
                                showKeywords={showKeywords}
                                onPlaceCard={onPlaceCard}
                              />
                            ))}
                          </div>
                        )}
                      </section>
                    );
                  })}

                  {group.uncategorizedCards.length > 0 && (
                    <section className="browser-subdomain-group">
                      <div className="browser-subgroup-header browser-static-subgroup-header">
                        <span>Uncategorized</span>
                        <span>{group.uncategorizedCards.length}</span>
                      </div>
                      <div className="card-list">
                        {group.uncategorizedCards.map((card) => (
                          <BrowserCardButton
                            key={card.id}
                            card={card}
                            cardNameMode={cardNameMode}
                            showKeywords={showKeywords}
                            onPlaceCard={onPlaceCard}
                          />
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </section>
          );
        })}
      </div>

      {showCustomAssets && features.enableCustomAssets && (
        <section className="custom-assets-section">
          <h2>Custom Assets</h2>
          <div className="custom-content-body">
            {features.enableCustomCards && (
              <section className="custom-card-panel">
                <button
                  type="button"
                  className="browser-subgroup-header"
                  onClick={() => setCustomCardsOpen((current) => !current)}
                >
                  <span>Custom Cards</span>
                  <span>{customCards.length}</span>
                </button>
                {customCardsOpen && (
                  <div className="custom-content-subsection">
                    <div className="custom-content-actions">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCustomCard(null);
                          setCustomEditorOpen(true);
                        }}
                      >
                        + New custom card
                      </button>
                      <label className="file-menu-upload">
                        Import CSV
                        <input
                          type="file"
                          accept="text/csv,.csv"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (file) onImportCustomCardsCsv(file);
                          }}
                        />
                      </label>
                      <button type="button" onClick={onExportCustomCardsCsv}>
                        Export CSV
                      </button>
                      <label className="file-menu-upload">
                        Import JSON
                        <input
                          type="file"
                          accept="application/json,.json"
                          onChange={(event) => {
                            const file = event.currentTarget.files?.[0];
                            event.currentTarget.value = "";
                            if (file) onImportCustomCardsJson(file);
                          }}
                        />
                      </label>
                      <button type="button" onClick={onExportCustomCardsJson}>
                        Export JSON
                      </button>
                    </div>
                    <CustomCardList
                      cards={customCards}
                      onPlace={onPlaceCard}
                      onEdit={(card) => {
                        setEditingCustomCard(card);
                        setCustomEditorOpen(true);
                      }}
                      onDelete={onDeleteCustomCard}
                    />
                    {customEditorOpen && (
                      <CustomCardEditor
                        card={editingCustomCard}
                        onSave={(input) => {
                          if (editingCustomCard) onUpdateCustomCard(editingCustomCard, input);
                          else onCreateCustomCard(input);
                          setCustomEditorOpen(false);
                          setEditingCustomCard(null);
                        }}
                        onCancel={() => {
                          setCustomEditorOpen(false);
                          setEditingCustomCard(null);
                        }}
                      />
                    )}
                  </div>
                )}
              </section>
            )}

            {features.enableCustomDomains && (
              <section className="custom-domain-browser-panel">
                <button
                  type="button"
                  className="browser-subgroup-header"
                  onClick={() => setCustomDomainsOpen((current) => !current)}
                >
                  <span>Custom Domains</span>
                  <span>{activeCustomDomainIds.length}/{discoveredCustomDomains.length}</span>
                </button>
                {customDomainsOpen && (
                  <div className="custom-content-subsection">
                    <div className="custom-content-actions">
                      <button type="button" onClick={() => setDiscoverInstructionsOpen(true)}>
                        Discover custom domains
                      </button>
                      <button type="button" onClick={onManageCustomDomains}>
                        Manage custom domains
                      </button>
                      <button type="button" onClick={onOpenCustomDomainsHelp}>
                        Build custom domain
                      </button>
                    </div>
                  {discoverInstructionsOpen && (
                    <div className="custom-domain-instructions">
                      <button
                        type="button"
                        className="panel-close-button"
                        aria-label="Close custom domain discovery instructions"
                        onClick={() => setDiscoverInstructionsOpen(false)}
                      >
                        ×
                      </button>
                      <strong>Discover custom domains</strong>
                      <p>
                        The browser app cannot scan your filesystem or run scripts directly.
                        To discover newly added custom domains, open a terminal in the
                        repository root of <code>data-science-deck-app</code>, then run{" "}
                        <code>{getCustomDomainsSyncCommand()}</code>. Reload the app afterwards.
                      </p>
                      <p>
                        The sync command scans <code>{getCustomDomainsFolderPath()}</code>,
                        reads each domain&apos;s <code>templates/domain_metadata.txt</code> and
                        card CSV, finds generated PDFs in <code>output/</code>, generates
                        previews, and updates the app manifest.
                      </p>
                      <p>
                        If the domain still does not appear, check that the folder is inside{" "}
                        <code>{getCustomDomainsFolderPath()}</code>, that metadata and the
                        referenced CSV exist, that expected PDFs were generated into{" "}
                        <code>output/</code>, and that the terminal sync output has no relevant
                        warnings. Discovered domains are inactive by default; after reload,
                        open Manage custom domains and enable the domain.
                      </p>
                      <button type="button" onClick={() => copyText(getCustomDomainsSyncCommand())}>
                        Copy command
                      </button>
                      <button type="button" onClick={() => copyText(getCustomDomainsFolderPath())}>
                        Copy folder path
                      </button>
                    </div>
                  )}
                  {discoveredCustomDomains.length === 0 ? (
                    <p className="muted custom-card-empty">No custom domains discovered.</p>
                  ) : (
                    <div className="custom-domain-browser-list">
                      {discoveredCustomDomains.map((domain) => {
                        const enabled = activeCustomDomainIds.includes(domain.id);
                        return (
                          <div key={domain.id} className="custom-domain-browser-row">
                            <span>{domain.name}</span>
                            <small>{domain.cardCount} cards</small>
                            <span className={enabled ? "status-badge active" : "status-badge"}>
                              {enabled ? "active" : "inactive"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                )}
              </section>
            )}
          </div>
        </section>
      )}
    </aside>
  );
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

function BrowserCardButton({
  card,
  cardNameMode,
  showKeywords,
  onPlaceCard
}: {
  card: DeckCard;
  cardNameMode: CardNameMode;
  showKeywords: boolean;
  onPlaceCard: (card: DeckCard) => void;
}) {
  return (
    <button
      className={`browser-card ${domainClass(card.domain)}`}
      onClick={() => onPlaceCard(card)}
    >
      <strong>{getCardDisplayName(card, cardNameMode)}</strong>
      {cardNameMode === "both" && card.twin ? (
        <span>{card.twin}</span>
      ) : (
        <span>
          {card.domain}
          {card.subdomain ? ` · ${card.subdomain}` : ""}
        </span>
      )}
      {showKeywords && card.keywords.length > 0 && <span>{card.keywords.join(", ")}</span>}
    </button>
  );
}

function toggleSetValue(values: Set<string>, value: string) {
  const next = new Set(values);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
