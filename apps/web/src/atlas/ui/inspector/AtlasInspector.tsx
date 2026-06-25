import { useEffect, useState } from "react";
import {
  buildTaggedSumExpression,
  collectExpressionPropertyNames,
  createTaggedSumConfig,
  getFunctionDependencySummary,
  getTaggedSumMatchingCards,
  getTaggedSumMissingPropertyCards
} from "../../core/functions";
import { collectPropertyNamesForQuery, expressionPreview } from "../../core/expressions";
import {
  ATLAS_PROPERTY_KINDS,
  type AtlasCard,
  type AtlasCardQuery,
  type AtlasExpression,
  type AtlasGroup,
  type AtlasProperty,
  type AtlasPropertyKind,
  type AtlasTaggedSumConfig
} from "../../core/types";

type AtlasInspectorProps = {
  card: AtlasCard | null;
  group: AtlasGroup | null;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  dependencyHighlightEnabled: boolean;
  onAddTag: (cardId: string, key: string, value: string) => void;
  onUpdateTag: (cardId: string, tagId: string, key: string, value: string) => void;
  onDeleteTag: (cardId: string, tagId: string) => void;
  onAddProperty: (
    cardId: string,
    property: EditablePropertyPayload
  ) => void;
  onUpdateProperty: (
    cardId: string,
    propertyId: string,
    property: EditablePropertyPayload
  ) => void;
  onDeleteProperty: (cardId: string, propertyId: string) => void;
  onUpdateTaggedSum: (cardId: string, patch: Partial<AtlasTaggedSumConfig>) => void;
  onToggleDependencyHighlight: () => void;
  onUpdateGroup: (
    groupId: string,
    patch: Partial<Pick<AtlasGroup, "title" | "position" | "size" | "color" | "notes">>
  ) => void;
  onDeleteGroup: (groupId: string) => void;
  onDeleteCard: (cardId: string) => void;
  onClear: () => void;
};

const TAG_KEY_PRESETS = ["type", "group", "status"];
const PROPERTY_KIND_LABELS: Record<AtlasPropertyKind, string> = {
  constant: "Constant",
  formula: "Formula",
  decision_ref: "Decision ref",
  data_ref: "Data ref"
};

type EditablePropertyPayload = {
  name: string;
  kind: AtlasPropertyKind;
  value: AtlasProperty["value"];
  unit?: string;
  notes?: string;
};

type PropertyDraft = {
  name: string;
  kind: AtlasPropertyKind;
  value: string;
  unit: string;
  notes: string;
};

const EMPTY_PROPERTY_DRAFT: PropertyDraft = {
  name: "",
  kind: "constant",
  value: "",
  unit: "",
  notes: ""
};

type TaggedSumExpressionMode = "property" | "property_times_property" | "property_times_literal";

export function AtlasInspector({
  card,
  group,
  cards,
  queries,
  dependencyHighlightEnabled,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onUpdateTaggedSum,
  onToggleDependencyHighlight,
  onUpdateGroup,
  onDeleteGroup,
  onDeleteCard,
  onClear
}: AtlasInspectorProps) {
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");
  const [tagDrafts, setTagDrafts] = useState<Record<string, { key: string; value: string }>>({});
  const [tagError, setTagError] = useState("");
  const [newProperty, setNewProperty] = useState<PropertyDraft>(EMPTY_PROPERTY_DRAFT);
  const [propertyDrafts, setPropertyDrafts] = useState<Record<string, PropertyDraft>>({});
  const [propertyError, setPropertyError] = useState("");
  const [taggedSumMode, setTaggedSumMode] = useState<TaggedSumExpressionMode>("property");
  const [taggedSumPrimaryProperty, setTaggedSumPrimaryProperty] = useState("");
  const [taggedSumSecondaryProperty, setTaggedSumSecondaryProperty] = useState("");
  const [taggedSumLiteral, setTaggedSumLiteral] = useState("1");
  const [groupDraft, setGroupDraft] = useState({
    title: "",
    notes: "",
    x: "0",
    y: "0",
    width: "720",
    height: "420",
    color: ""
  });

  useEffect(() => {
    setTagDrafts(
      Object.fromEntries(card?.tags.map((tag) => [tag.id, { key: tag.key, value: tag.value }]) ?? [])
    );
    setTagError("");
  }, [card?.id, card?.tags]);

  useEffect(() => {
    setPropertyDrafts(
      Object.fromEntries(
        card?.properties.map((property) => [property.id, propertyToDraft(property)]) ?? []
      )
    );
    setPropertyError("");
  }, [card?.id, card?.properties]);

  useEffect(() => {
    if (card?.type !== "function" || card.functionKind !== "tagged_sum") return;
    const expression = card.taggedSum?.expression;
    setTaggedSumPrimaryProperty(firstPropertyName(expression));
    setTaggedSumSecondaryProperty(secondPropertyName(expression));
    setTaggedSumLiteral(firstLiteralValue(expression));
    setTaggedSumMode(expressionMode(expression));
  }, [card?.id, card?.taggedSum?.expression, card?.type, card?.functionKind]);

  useEffect(() => {
    if (!group) return;
    setGroupDraft({
      title: group.title,
      notes: group.notes,
      x: String(group.position.x),
      y: String(group.position.y),
      width: String(group.size.width),
      height: String(group.size.height),
      color: group.color ?? ""
    });
  }, [group]);

  if (group) {
    return (
      <section className="atlas-panel atlas-inspector-panel" aria-label="Atlas group inspector">
        <header>
          <p className="atlas-eyebrow">Group</p>
          <h2>{group.title}</h2>
        </header>

        <form
          className="atlas-group-form"
          onSubmit={(event) => {
            event.preventDefault();
            onUpdateGroup(group.id, {
              title: groupDraft.title,
              notes: groupDraft.notes,
              color: groupDraft.color.trim() || undefined,
              position: {
                x: numberDraft(groupDraft.x, group.position.x),
                y: numberDraft(groupDraft.y, group.position.y)
              },
              size: {
                width: numberDraft(groupDraft.width, group.size.width),
                height: numberDraft(groupDraft.height, group.size.height)
              }
            });
          }}
        >
          <label>
            <span>Title</span>
            <input
              value={groupDraft.title}
              onChange={(event) =>
                setGroupDraft((current) => ({ ...current, title: event.target.value }))
              }
              aria-label="Group title"
            />
          </label>
          <label>
            <span>Notes</span>
            <textarea
              value={groupDraft.notes}
              onChange={(event) =>
                setGroupDraft((current) => ({ ...current, notes: event.target.value }))
              }
              aria-label="Group notes"
            />
          </label>
          <div className="atlas-group-form-grid">
            <label>
              <span>X</span>
              <input
                value={groupDraft.x}
                onChange={(event) =>
                  setGroupDraft((current) => ({ ...current, x: event.target.value }))
                }
                inputMode="numeric"
              />
            </label>
            <label>
              <span>Y</span>
              <input
                value={groupDraft.y}
                onChange={(event) =>
                  setGroupDraft((current) => ({ ...current, y: event.target.value }))
                }
                inputMode="numeric"
              />
            </label>
            <label>
              <span>Width</span>
              <input
                value={groupDraft.width}
                onChange={(event) =>
                  setGroupDraft((current) => ({ ...current, width: event.target.value }))
                }
                inputMode="numeric"
              />
            </label>
            <label>
              <span>Height</span>
              <input
                value={groupDraft.height}
                onChange={(event) =>
                  setGroupDraft((current) => ({ ...current, height: event.target.value }))
                }
                inputMode="numeric"
              />
            </label>
          </div>
          <label>
            <span>Color</span>
            <input
              value={groupDraft.color}
              onChange={(event) =>
                setGroupDraft((current) => ({ ...current, color: event.target.value }))
              }
              placeholder="#4dabf7"
              aria-label="Group color"
            />
          </label>
          <div className="atlas-inspector-actions">
            <button type="submit">Save group</button>
            <button type="button" className="atlas-danger-button" onClick={() => onDeleteGroup(group.id)}>
              Delete group
            </button>
          </div>
        </form>
      </section>
    );
  }

  if (!card) {
    return (
      <section className="atlas-panel atlas-inspector-panel" aria-label="Atlas inspector">
        <header>
          <p className="atlas-eyebrow">Inspector</p>
          <h2>No selection</h2>
        </header>
        <p className="atlas-muted">
          Select a card to inspect its type, position, tags, properties, and notes.
        </p>
        <button type="button" className="atlas-danger-button" onClick={onClear}>
          Clear workbench
        </button>
      </section>
    );
  }

  const selectedCard = card;

  function addTag(key: string, value = "") {
    const trimmedKey = key.trim();
    if (!trimmedKey) {
      setTagError("Tag key is required.");
      return;
    }

    onAddTag(selectedCard.id, trimmedKey, value);
    setNewTagKey("");
    setNewTagValue("");
    setTagError("");
  }

  function updateTag(tagId: string) {
    const draft = tagDrafts[tagId];
    const trimmedKey = draft?.key.trim() ?? "";
    if (!trimmedKey) {
      setTagError("Tag key is required.");
      return;
    }

    onUpdateTag(selectedCard.id, tagId, trimmedKey, draft?.value ?? "");
    setTagError("");
  }

  function addProperty() {
    const payload = propertyDraftToPayload(newProperty);
    if (!payload) {
      setPropertyError("Property name is required.");
      return;
    }

    onAddProperty(selectedCard.id, payload);
    setNewProperty(EMPTY_PROPERTY_DRAFT);
    setPropertyError("");
  }

  function updateProperty(propertyId: string) {
    const payload = propertyDraftToPayload(propertyDrafts[propertyId]);
    if (!payload) {
      setPropertyError("Property name is required.");
      return;
    }

    onUpdateProperty(selectedCard.id, propertyId, payload);
    setPropertyError("");
  }

  return (
    <section className="atlas-panel atlas-inspector-panel" aria-label="Atlas inspector">
      <header>
        <p className="atlas-eyebrow">Inspector</p>
        <h2>{card.title}</h2>
      </header>
      <dl className="atlas-placeholder-list">
        <div>
          <dt>Type</dt>
          <dd>{card.type}</dd>
        </div>
        <div>
          <dt>Position</dt>
          <dd>
            x {card.position.x}, y {card.position.y}
          </dd>
        </div>
        <div>
          <dt>Tags</dt>
          <dd>{card.tags.length === 0 ? "No tags yet." : `${card.tags.length} tags`}</dd>
        </div>
        <div>
          <dt>Properties</dt>
          <dd>
            {card.properties.length === 0
              ? "No properties yet."
              : `${card.properties.length} properties`}
          </dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{card.notes || "No notes yet."}</dd>
        </div>
      </dl>

      <section className="atlas-tag-editor" aria-label="Typed tags">
        <header>
          <h3>Typed Tags</h3>
          <p className="atlas-muted">Tags are simple key/value strings for later query indexing.</p>
        </header>

        <div className="atlas-tag-presets" aria-label="Quick-add tag keys">
          {TAG_KEY_PRESETS.map((preset) => (
            <button key={preset} type="button" onClick={() => setNewTagKey(preset)}>
              {preset}
            </button>
          ))}
        </div>

        <form
          className="atlas-tag-form"
          onSubmit={(event) => {
            event.preventDefault();
            addTag(newTagKey, newTagValue);
          }}
        >
          <input
            value={newTagKey}
            onChange={(event) => setNewTagKey(event.target.value)}
            placeholder="key"
            aria-label="New tag key"
          />
          <input
            value={newTagValue}
            onChange={(event) => setNewTagValue(event.target.value)}
            placeholder="value"
            aria-label="New tag value"
          />
          <button type="submit">Add tag</button>
        </form>

        {tagError && <p className="atlas-form-error">{tagError}</p>}

        <div className="atlas-tag-list">
          {card.tags.length === 0 ? (
            <p className="atlas-muted">Add tags such as type, group, or status.</p>
          ) : (
            card.tags.map((tag) => {
              const draft = tagDrafts[tag.id] ?? { key: tag.key, value: tag.value };

              return (
                <div key={tag.id} className="atlas-tag-row">
                  <input
                    value={draft.key}
                    onChange={(event) =>
                      setTagDrafts((current) => ({
                        ...current,
                        [tag.id]: { ...draft, key: event.target.value }
                      }))
                    }
                    aria-label={`Tag key ${tag.key}`}
                  />
                  <input
                    value={draft.value}
                    onChange={(event) =>
                      setTagDrafts((current) => ({
                        ...current,
                        [tag.id]: { ...draft, value: event.target.value }
                      }))
                    }
                    aria-label={`Tag value ${tag.key}`}
                  />
                  <button type="button" onClick={() => updateTag(tag.id)}>
                    Save
                  </button>
                  <button type="button" onClick={() => onDeleteTag(card.id, tag.id)}>
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="atlas-property-editor" aria-label="Card properties">
        <header>
          <h3>Properties</h3>
          <p className="atlas-muted">
            Store constants, plain-text formulas, decision references, and data references.
          </p>
        </header>

        <form
          className="atlas-property-form"
          onSubmit={(event) => {
            event.preventDefault();
            addProperty();
          }}
        >
          <input
            value={newProperty.name}
            onChange={(event) =>
              setNewProperty((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="name"
            aria-label="New property name"
          />
          <select
            value={newProperty.kind}
            onChange={(event) =>
              setNewProperty((current) => ({
                ...current,
                kind: event.target.value as AtlasPropertyKind
              }))
            }
            aria-label="New property kind"
          >
            {ATLAS_PROPERTY_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {PROPERTY_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
          <input
            value={newProperty.value}
            onChange={(event) =>
              setNewProperty((current) => ({ ...current, value: event.target.value }))
            }
            placeholder="value or reference"
            aria-label="New property value"
          />
          <input
            value={newProperty.unit}
            onChange={(event) =>
              setNewProperty((current) => ({ ...current, unit: event.target.value }))
            }
            placeholder="unit"
            aria-label="New property unit"
          />
          <input
            value={newProperty.notes}
            onChange={(event) =>
              setNewProperty((current) => ({ ...current, notes: event.target.value }))
            }
            placeholder="notes"
            aria-label="New property notes"
          />
          <button type="submit">Add property</button>
        </form>

        {propertyError && <p className="atlas-form-error">{propertyError}</p>}

        <div className="atlas-property-list">
          {card.properties.length === 0 ? (
            <p className="atlas-muted">Add properties such as unit_cost or production_quantity.</p>
          ) : (
            card.properties.map((property) => {
              const draft = propertyDrafts[property.id] ?? propertyToDraft(property);

              return (
                <div key={property.id} className="atlas-property-row">
                  <input
                    value={draft.name}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: { ...draft, name: event.target.value }
                      }))
                    }
                    aria-label={`Property name ${property.name}`}
                  />
                  <select
                    value={draft.kind}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: {
                          ...draft,
                          kind: event.target.value as AtlasPropertyKind
                        }
                      }))
                    }
                    aria-label={`Property kind ${property.name}`}
                  >
                    {ATLAS_PROPERTY_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {PROPERTY_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </select>
                  <input
                    value={draft.value}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: { ...draft, value: event.target.value }
                      }))
                    }
                    aria-label={`Property value ${property.name}`}
                  />
                  <input
                    value={draft.unit}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: { ...draft, unit: event.target.value }
                      }))
                    }
                    aria-label={`Property unit ${property.name}`}
                  />
                  <input
                    value={draft.notes}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: { ...draft, notes: event.target.value }
                      }))
                    }
                    aria-label={`Property notes ${property.name}`}
                  />
                  <button type="button" onClick={() => updateProperty(property.id)}>
                    Save
                  </button>
                  <button type="button" onClick={() => onDeleteProperty(card.id, property.id)}>
                    Remove
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {card.type === "function" && (
        <TaggedSumEditor
          card={card}
          cards={cards}
          queries={queries}
          mode={taggedSumMode}
          primaryProperty={taggedSumPrimaryProperty}
          secondaryProperty={taggedSumSecondaryProperty}
          literalValue={taggedSumLiteral}
          onModeChange={setTaggedSumMode}
          onPrimaryPropertyChange={setTaggedSumPrimaryProperty}
          onSecondaryPropertyChange={setTaggedSumSecondaryProperty}
          onLiteralValueChange={setTaggedSumLiteral}
          onUpdateTaggedSum={onUpdateTaggedSum}
          dependencyHighlightEnabled={dependencyHighlightEnabled}
          onToggleDependencyHighlight={onToggleDependencyHighlight}
        />
      )}

      <button type="button" className="atlas-danger-button" onClick={() => onDeleteCard(card.id)}>
        Delete card
      </button>
    </section>
  );
}

function TaggedSumEditor({
  card,
  cards,
  queries,
  mode,
  primaryProperty,
  secondaryProperty,
  literalValue,
  onModeChange,
  onPrimaryPropertyChange,
  onSecondaryPropertyChange,
  onLiteralValueChange,
  onUpdateTaggedSum,
  dependencyHighlightEnabled,
  onToggleDependencyHighlight
}: {
  card: AtlasCard;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  mode: TaggedSumExpressionMode;
  primaryProperty: string;
  secondaryProperty: string;
  literalValue: string;
  onModeChange: (mode: TaggedSumExpressionMode) => void;
  onPrimaryPropertyChange: (propertyName: string) => void;
  onSecondaryPropertyChange: (propertyName: string) => void;
  onLiteralValueChange: (value: string) => void;
  onUpdateTaggedSum: (cardId: string, patch: Partial<AtlasTaggedSumConfig>) => void;
  dependencyHighlightEnabled: boolean;
  onToggleDependencyHighlight: () => void;
}) {
  const config = createTaggedSumConfig(card.taggedSum);
  const selectedQuery = queries.find((query) => query.id === config.queryId) ?? null;
  const dependencySummary = getFunctionDependencySummary(card, queries, cards);
  const propertyNames = selectedQuery ? collectPropertyNamesForQuery(selectedQuery, cards) : [];
  const selectedPrimary = primaryProperty || propertyNames[0] || "";
  const selectedSecondary = secondaryProperty || propertyNames[1] || selectedPrimary;
  const matchedCards = getTaggedSumMatchingCards(card, queries, cards);
  const missingCards = getTaggedSumMissingPropertyCards(card, queries, cards);
  const expressionPropertyNames = config.expression
    ? collectExpressionPropertyNames(config.expression)
    : [];

  function updateExpression(nextMode = mode, nextPrimary = selectedPrimary) {
    if (!config.queryId || !nextPrimary) return;
    const expression = buildTaggedSumExpression({
      queryId: config.queryId,
      primaryProperty: nextPrimary,
      secondaryProperty:
        nextMode === "property_times_property" ? selectedSecondary : undefined,
      literalValue: nextMode === "property_times_literal" ? literalValue : undefined
    });
    onUpdateTaggedSum(card.id, { expression });
  }

  return (
    <section className="atlas-function-editor" aria-label="TaggedSum function configuration">
      <header>
        <h3>TaggedSum Function</h3>
        <p className="atlas-muted">
          Select cards by query, apply a property expression to each match, and sum later.
        </p>
      </header>

      <label>
        <span>Display name</span>
        <input
          value={config.displayName}
          onChange={(event) =>
            onUpdateTaggedSum(card.id, { displayName: event.target.value })
          }
          aria-label="TaggedSum display name"
        />
      </label>

      <label>
        <span>Query</span>
        <select
          value={config.queryId ?? ""}
          onChange={(event) => {
            const queryId = event.target.value || null;
            onUpdateTaggedSum(card.id, { queryId, expression: null });
            onPrimaryPropertyChange("");
            onSecondaryPropertyChange("");
          }}
          aria-label="TaggedSum query"
        >
          <option value="">Select query</option>
          {queries.map((query) => (
            <option key={query.id} value={query.id}>
              {query.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Description</span>
        <textarea
          value={config.description ?? ""}
          onChange={(event) =>
            onUpdateTaggedSum(card.id, { description: optionalText(event.target.value) })
          }
          aria-label="TaggedSum description"
        />
      </label>

      {!selectedQuery ? (
        <p className="atlas-muted">Create and select a query before choosing function properties.</p>
      ) : propertyNames.length === 0 ? (
        <p className="atlas-muted">Matching cards do not expose properties yet.</p>
      ) : (
        <>
          <p className="atlas-muted">
            Query <strong>{selectedQuery.name}</strong> matches {matchedCards.length} cards.
          </p>

          <label>
            <span>Expression type</span>
            <select
              value={mode}
              onChange={(event) => {
                const nextMode = event.target.value as TaggedSumExpressionMode;
                onModeChange(nextMode);
                updateExpression(nextMode);
              }}
              aria-label="TaggedSum expression type"
            >
              <option value="property">Selected property</option>
              <option value="property_times_property">Property x property</option>
              <option value="property_times_literal">Property x numeric literal</option>
            </select>
          </label>

          <label>
            <span>Property</span>
            <select
              value={selectedPrimary}
              onChange={(event) => {
                onPrimaryPropertyChange(event.target.value);
                updateExpression(mode, event.target.value);
              }}
              aria-label="TaggedSum primary property"
            >
              {propertyNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          {mode === "property_times_property" && (
            <label>
              <span>Second property</span>
              <select
                value={selectedSecondary}
                onChange={(event) => {
                  onSecondaryPropertyChange(event.target.value);
                  const expression = buildTaggedSumExpression({
                    queryId: config.queryId ?? selectedQuery.id,
                    primaryProperty: selectedPrimary,
                    secondaryProperty: event.target.value
                  });
                  onUpdateTaggedSum(card.id, { expression });
                }}
                aria-label="TaggedSum secondary property"
              >
                {propertyNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === "property_times_literal" && (
            <label>
              <span>Numeric literal</span>
              <input
                value={literalValue}
                onChange={(event) => {
                  onLiteralValueChange(event.target.value);
                  const expression = buildTaggedSumExpression({
                    queryId: config.queryId ?? selectedQuery.id,
                    primaryProperty: selectedPrimary,
                    literalValue: event.target.value
                  });
                  onUpdateTaggedSum(card.id, { expression });
                }}
                aria-label="TaggedSum numeric literal"
              />
            </label>
          )}

          <button type="button" onClick={() => updateExpression()}>
            Save expression
          </button>

          {config.expression && (
            <div className="atlas-expression-preview" aria-label="TaggedSum expression preview">
              <span>Preview</span>
              <strong>{expressionPreview(config.expression)}</strong>
            </div>
          )}

          {missingCards.length > 0 && (
            <div className="atlas-property-warning" role="status">
              <strong>
                {missingCards.length} matching cards missing {expressionPropertyNames.join(", ")}
              </strong>
              <ul>
                {missingCards.map((matchedCard) => (
                  <li key={matchedCard.id}>{matchedCard.title}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
      <section className="atlas-dependency-summary" aria-label="Function dependency summary">
        <header>
          <h4>Dependencies</h4>
          <label className="atlas-inline-toggle">
            <input
              type="checkbox"
              checked={dependencyHighlightEnabled}
              onChange={onToggleDependencyHighlight}
            />
            <span>Highlight dependencies</span>
          </label>
        </header>
        <dl>
          <div>
            <dt>Query</dt>
            <dd>{dependencySummary.query?.name ?? "No query selected"}</dd>
          </div>
          <div>
            <dt>Matched cards</dt>
            <dd>{dependencySummary.matchedCards.length}</dd>
          </div>
          <div>
            <dt>Used properties</dt>
            <dd>
              {dependencySummary.usedProperties.length === 0
                ? "No expression properties selected"
                : dependencySummary.usedProperties.join(", ")}
            </dd>
          </div>
          <div>
            <dt>Missing properties</dt>
            <dd>
              {dependencySummary.missingCards.length === 0
                ? "None"
                : dependencySummary.missingCards.map((matchedCard) => matchedCard.title).join(", ")}
            </dd>
          </div>
        </dl>
      </section>
    </section>
  );
}

function propertyToDraft(property: AtlasProperty): PropertyDraft {
  return {
    name: property.name,
    kind: property.kind,
    value: property.value === null ? "" : String(property.value),
    unit: property.unit ?? "",
    notes: property.notes ?? ""
  };
}

function propertyDraftToPayload(draft: PropertyDraft | undefined): EditablePropertyPayload | null {
  const name = draft?.name.trim() ?? "";
  if (!draft || !name) return null;

  return {
    name,
    kind: draft.kind,
    value: normalizePropertyDraftValue(draft),
    unit: optionalText(draft.unit),
    notes: optionalText(draft.notes)
  };
}

function normalizePropertyDraftValue(draft: PropertyDraft): AtlasProperty["value"] {
  const value = draft.value.trim();
  if (!value) return "";
  if (draft.kind !== "constant") return value;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && value !== "" ? numericValue : value;
}

function expressionMode(expression: AtlasExpression | null | undefined): TaggedSumExpressionMode {
  if (expression?.kind !== "multiply") return "property";
  if (expression.right.kind === "property_ref") return "property_times_property";
  if (expression.right.kind === "literal") return "property_times_literal";
  return "property";
}

function firstPropertyName(expression: AtlasExpression | null | undefined): string {
  if (!expression) return "";
  if (expression.kind === "property_ref") return expression.propertyName;
  if (expression.kind === "multiply") return firstPropertyName(expression.left);
  if (expression.kind === "add") return firstPropertyName(expression.terms[0]);
  return "";
}

function secondPropertyName(expression: AtlasExpression | null | undefined): string {
  if (expression?.kind === "multiply" && expression.right.kind === "property_ref") {
    return expression.right.propertyName;
  }
  return "";
}

function firstLiteralValue(expression: AtlasExpression | null | undefined): string {
  if (expression?.kind === "multiply" && expression.right.kind === "literal") {
    return String(expression.right.value);
  }
  return "1";
}

function optionalText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberDraft(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
