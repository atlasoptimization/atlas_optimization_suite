import { useEffect, useState } from "react";
import { parseAtlasCsv } from "../../core/csv";
import {
  ATLAS_CONSTRAINT_OPERATORS,
  constraintPreview,
  createConstantConstraintExpression,
  createConstraintConfig,
  createFunctionConstraintExpression,
  getConstraintDependencySummary
} from "../../core/constraints";
import {
  buildTaggedSumExpression,
  collectExpressionPropertyNames,
  createTaggedSumConfig,
  getFunctionDependencySummary,
  getTaggedSumMatchingCards,
  getTaggedSumMissingPropertyCards
} from "../../core/functions";
import type { AtlasEvaluationEntry, AtlasEvaluationMode } from "../../core/evaluator";
import {
  createObjectiveConfig,
  getObjectiveDependencySummary,
  objectivePreview
} from "../../core/objectives";
import {
  buildLinearExpressionFromTerms,
  collectPropertyNamesForQuery,
  createLinearTermDraft,
  expressionPreview,
  expressionToLinearTermDrafts,
  validateLinearExpression,
  type AtlasLinearTermDraft
} from "../../core/expressions";
import { createIndexSet, createRangeIndexSet, getIndexSetCards } from "../../core/indexSets";
import type { AtlasSymbolicPreview } from "../../core/symbolic";
import {
  ATLAS_PROPERTY_KINDS,
  type AtlasCard,
  type AtlasCardQuery,
  type AtlasConstraintConfig,
  type AtlasConstraintExpression,
  type AtlasExpression,
  type AtlasGroup,
  type AtlasProperty,
  type AtlasPropertyKind,
  type AtlasObjectiveConfig,
  type AtlasTaggedSumConfig
} from "../../core/types";

type AtlasInspectorProps = {
  card: AtlasCard | null;
  group: AtlasGroup | null;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  evaluationEntry: AtlasEvaluationEntry | null;
  evaluationMode: AtlasEvaluationMode;
  solutionEvaluationWarning?: string | null;
  symbolicPreview: AtlasSymbolicPreview | null;
  dependencyHighlightEnabled: boolean;
  onAddTag: (cardId: string, key: string, value: string) => void;
  onUpdateTag: (cardId: string, tagId: string, key: string, value: string) => void;
  onDeleteTag: (cardId: string, tagId: string) => void;
  onUpdateCardDetails: (
    cardId: string,
    patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">>
  ) => void;
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
  onUpdateObjective: (cardId: string, patch: Partial<Pick<AtlasObjectiveConfig, "direction">>) => void;
  onAddObjectiveTerm: (cardId: string, functionCardId?: string | null) => void;
  onUpdateObjectiveTerm: (
    cardId: string,
    termId: string,
    name: string,
    functionCardId: string | null
  ) => void;
  onRemoveObjectiveTerm: (cardId: string, termId: string) => void;
  onMoveObjectiveTerm: (cardId: string, termId: string, direction: "up" | "down") => void;
  onFocusObjectiveTerm: (termId: string | null) => void;
  onUpdateConstraint: (cardId: string, patch: Partial<AtlasConstraintConfig>) => void;
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
  indexSetId?: string;
  unit?: string;
  notes?: string;
};

type PropertyDraft = {
  name: string;
  kind: AtlasPropertyKind;
  value: string;
  indexSetId: string;
  unit: string;
  notes: string;
};

const EMPTY_PROPERTY_DRAFT: PropertyDraft = {
  name: "",
  kind: "constant",
  value: "",
  indexSetId: "",
  unit: "",
  notes: ""
};

type TaggedSumExpressionMode = "property" | "property_times_property" | "property_times_literal";

export function AtlasInspector({
  card,
  group,
  cards,
  queries,
  evaluationEntry,
  evaluationMode,
  solutionEvaluationWarning,
  symbolicPreview,
  dependencyHighlightEnabled,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
  onUpdateCardDetails,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onUpdateTaggedSum,
  onUpdateObjective,
  onAddObjectiveTerm,
  onUpdateObjectiveTerm,
  onRemoveObjectiveTerm,
  onMoveObjectiveTerm,
  onFocusObjectiveTerm,
  onUpdateConstraint,
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
  const [cardDetailsDraft, setCardDetailsDraft] = useState({ title: "", notes: "" });
  const [taggedSumMode, setTaggedSumMode] = useState<TaggedSumExpressionMode>("property");
  const [taggedSumPrimaryProperty, setTaggedSumPrimaryProperty] = useState("");
  const [taggedSumSecondaryProperty, setTaggedSumSecondaryProperty] = useState("");
  const [taggedSumLiteral, setTaggedSumLiteral] = useState("1");
  const [linearTermDrafts, setLinearTermDrafts] = useState<AtlasLinearTermDraft[]>([
    createLinearTermDraft()
  ]);
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
    setCardDetailsDraft({ title: card?.title ?? "", notes: card?.notes ?? "" });
  }, [card?.id, card?.title, card?.notes]);

  useEffect(() => {
    if (card?.type !== "function" || card.functionKind !== "tagged_sum") return;
    const expression = card.taggedSum?.expression;
    setTaggedSumPrimaryProperty(firstPropertyName(expression));
    setTaggedSumSecondaryProperty(secondPropertyName(expression));
    setTaggedSumLiteral(firstLiteralValue(expression));
    setTaggedSumMode(expressionMode(expression));
    setLinearTermDrafts(expressionToLinearTermDrafts(expression ?? null));
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
  const indexSetCards = getIndexSetCards({ cards });

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

      <EvaluationPanel
        entry={evaluationEntry}
        mode={evaluationMode}
        warning={solutionEvaluationWarning}
      />
      <GeneratedMathPanel preview={symbolicPreview} />
      {card.type === "decision" && (
        <DecisionMetadataEditor card={card} onUpdateCardDetails={onUpdateCardDetails} />
      )}
      {card.type === "data" && (
        <>
          <IndexSetEditor card={card} onUpdateCardDetails={onUpdateCardDetails} />
          <CsvDataEditor card={card} onUpdateCardDetails={onUpdateCardDetails} />
        </>
      )}

      <section className="atlas-function-editor" aria-label="Card details">
        <header>
          <h3>Details</h3>
        </header>
        <label>
          <span>Title</span>
          <input
            value={cardDetailsDraft.title}
            onChange={(event) =>
              setCardDetailsDraft((current) => ({ ...current, title: event.target.value }))
            }
            onBlur={() => onUpdateCardDetails(card.id, { title: cardDetailsDraft.title })}
            aria-label="Card title"
          />
        </label>
        <label>
          <span>Notes</span>
          <textarea
            value={cardDetailsDraft.notes}
            onChange={(event) =>
              setCardDetailsDraft((current) => ({ ...current, notes: event.target.value }))
            }
            onBlur={() => onUpdateCardDetails(card.id, { notes: cardDetailsDraft.notes })}
            aria-label="Card notes"
          />
        </label>
      </section>

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
          <select
            value={newProperty.indexSetId}
            onChange={(event) =>
              setNewProperty((current) => ({ ...current, indexSetId: event.target.value }))
            }
            aria-label="New property index set"
          >
            <option value="">Scalar</option>
            {indexSetCards.map((indexCard) => (
              <option key={indexCard.id} value={indexCard.id}>
                {indexCard.data?.indexSet?.name ?? indexCard.title}
              </option>
            ))}
          </select>
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
                  <select
                    value={draft.indexSetId}
                    onChange={(event) =>
                      setPropertyDrafts((current) => ({
                        ...current,
                        [property.id]: { ...draft, indexSetId: event.target.value }
                      }))
                    }
                    aria-label={`Property index set ${property.name}`}
                  >
                    <option value="">Scalar</option>
                    {indexSetCards.map((indexCard) => (
                      <option key={indexCard.id} value={indexCard.id}>
                        {indexCard.data?.indexSet?.name ?? indexCard.title}
                      </option>
                    ))}
                  </select>
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
          linearTermDrafts={linearTermDrafts}
          onModeChange={setTaggedSumMode}
          onPrimaryPropertyChange={setTaggedSumPrimaryProperty}
          onSecondaryPropertyChange={setTaggedSumSecondaryProperty}
          onLiteralValueChange={setTaggedSumLiteral}
          onLinearTermDraftsChange={setLinearTermDrafts}
          onUpdateTaggedSum={onUpdateTaggedSum}
          dependencyHighlightEnabled={dependencyHighlightEnabled}
          onToggleDependencyHighlight={onToggleDependencyHighlight}
        />
      )}

      {card.type === "objective" && (
        <ObjectiveEditor
          card={card}
          cards={cards}
          queries={queries}
          onUpdateObjective={onUpdateObjective}
          onAddObjectiveTerm={onAddObjectiveTerm}
          onUpdateObjectiveTerm={onUpdateObjectiveTerm}
          onRemoveObjectiveTerm={onRemoveObjectiveTerm}
          onMoveObjectiveTerm={onMoveObjectiveTerm}
          onFocusObjectiveTerm={onFocusObjectiveTerm}
        />
      )}

      {card.type === "constraint" && (
        <ConstraintEditor
          card={card}
          cards={cards}
          queries={queries}
          onUpdateConstraint={onUpdateConstraint}
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
  linearTermDrafts,
  onModeChange,
  onPrimaryPropertyChange,
  onSecondaryPropertyChange,
  onLiteralValueChange,
  onLinearTermDraftsChange,
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
  linearTermDrafts: AtlasLinearTermDraft[];
  onModeChange: (mode: TaggedSumExpressionMode) => void;
  onPrimaryPropertyChange: (propertyName: string) => void;
  onSecondaryPropertyChange: (propertyName: string) => void;
  onLiteralValueChange: (value: string) => void;
  onLinearTermDraftsChange: (terms: AtlasLinearTermDraft[]) => void;
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
  const linearDiagnostics = validateLinearExpression(config.expression, cards, selectedQuery);

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

          <section className="atlas-linear-editor" aria-label="Linear expression editor">
            <header>
              <h4>Linear terms</h4>
              <p className="atlas-muted">Build sums such as 2 * production_quantity + 5 * storage_quantity.</p>
            </header>
            {linearTermDrafts.map((term, index) => (
              <div key={term.id} className="atlas-linear-term-row">
                <input
                  value={term.coefficient}
                  onChange={(event) =>
                    onLinearTermDraftsChange(
                      linearTermDrafts.map((candidate) =>
                        candidate.id === term.id ? { ...candidate, coefficient: event.target.value } : candidate
                      )
                    )
                  }
                  aria-label={`Term ${index + 1} coefficient`}
                />
                <span>*</span>
                <select
                  value={term.propertyName}
                  onChange={(event) =>
                    onLinearTermDraftsChange(
                      linearTermDrafts.map((candidate) =>
                        candidate.id === term.id ? { ...candidate, propertyName: event.target.value } : candidate
                      )
                    )
                  }
                  aria-label={`Term ${index + 1} property`}
                >
                  <option value="">Property</option>
                  {propertyNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  value={term.multiplierPropertyName ?? ""}
                  onChange={(event) =>
                    onLinearTermDraftsChange(
                      linearTermDrafts.map((candidate) =>
                        candidate.id === term.id
                          ? { ...candidate, multiplierPropertyName: event.target.value || undefined }
                          : candidate
                      )
                    )
                  }
                  aria-label={`Term ${index + 1} optional property multiplier`}
                >
                  <option value="">No second property</option>
                  {propertyNames.map((name) => (
                    <option key={name} value={name}>
                      * {name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onLinearTermDraftsChange(linearTermDrafts.filter((candidate) => candidate.id !== term.id))
                  }
                >
                  Remove
                </button>
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => onLinearTermDraftsChange(moveLinearTerm(linearTermDrafts, index, -1))}
                >
                  Up
                </button>
                <button
                  type="button"
                  disabled={index === linearTermDrafts.length - 1}
                  onClick={() => onLinearTermDraftsChange(moveLinearTerm(linearTermDrafts, index, 1))}
                >
                  Down
                </button>
              </div>
            ))}
            <div className="atlas-inspector-actions">
              <button
                type="button"
                onClick={() => onLinearTermDraftsChange([...linearTermDrafts, createLinearTermDraft()])}
              >
                Add term
              </button>
              <button
                type="button"
                onClick={() => {
                  const expression = buildLinearExpressionFromTerms(config.queryId ?? selectedQuery.id, linearTermDrafts);
                  onUpdateTaggedSum(card.id, { expression });
                }}
              >
                Save linear expression
              </button>
            </div>
            {linearDiagnostics.length > 0 && (
              <div className="atlas-property-warning" role="status">
                {linearDiagnostics.map((diagnostic, index) => (
                  <p key={`${diagnostic.message}-${index}`}>{diagnostic.message}</p>
                ))}
              </div>
            )}
          </section>

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

function EvaluationPanel({
  entry,
  mode,
  warning
}: {
  entry: AtlasEvaluationEntry | null;
  mode: AtlasEvaluationMode;
  warning?: string | null;
}) {
  return (
    <section className="atlas-evaluation-panel" aria-label="Evaluation results">
      <header>
        <h3>Evaluation</h3>
      </header>
      {!entry ? (
        <p className="atlas-muted">Click Evaluate to compute prototype values.</p>
      ) : (
        <>
          <div className="atlas-expression-preview">
            <span>{mode === "solution" ? "Latest solution value" : "Current value"}</span>
            <strong>{formatEvaluationValue(entry)}</strong>
          </div>
          {warning && <p className="atlas-stale-warning">{warning}</p>}
          {entry.diagnostics.length === 0 ? (
            <p className="atlas-muted">No evaluation diagnostics.</p>
          ) : (
            <ul className="atlas-diagnostic-list">
              {entry.diagnostics.map((diagnostic, index) => (
                <li key={`${diagnostic.message}-${index}`}>
                  <strong>{diagnostic.level}</strong>
                  <span>{diagnostic.message}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function GeneratedMathPanel({ preview }: { preview: AtlasSymbolicPreview | null }) {
  return (
    <section className="atlas-evaluation-panel" aria-label="Generated Mathematics">
      <header>
        <h3>Generated Mathematics</h3>
      </header>
      {!preview ? (
        <p className="atlas-muted">Select a Function, Objective, or Constraint card.</p>
      ) : (
        <>
          <pre className="atlas-math-preview">{preview.expression}</pre>
          {preview.details.length > 0 && (
            <details>
              <summary>Participating objects</summary>
              <ul className="atlas-diagnostic-list">
                {preview.details.map((detail, index) => (
                  <li key={`${detail}-${index}`}>{detail}</li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function DecisionMetadataEditor({
  card,
  onUpdateCardDetails
}: {
  card: AtlasCard;
  onUpdateCardDetails: (
    cardId: string,
    patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">>
  ) => void;
}) {
  const metadata = card.decision ?? { variableType: "continuous" as const, shape: "scalar" as const, lowerBound: 0 };
  return (
    <section className="atlas-function-editor" aria-label="Decision variable metadata">
      <header>
        <h3>Decision Variable</h3>
        <p className="atlas-muted">Scalar decisions compile to CVXPY variables.</p>
      </header>
      <label>
        <span>Variable type</span>
        <select
          value={metadata.variableType}
          onChange={(event) =>
            onUpdateCardDetails(card.id, {
              decision: { ...metadata, variableType: event.target.value as "continuous" | "integer" | "binary" }
            })
          }
        >
          <option value="continuous">Continuous</option>
          <option value="integer">Integer</option>
          <option value="binary">Binary</option>
        </select>
      </label>
      {(["lowerBound", "upperBound", "initialValue"] as const).map((field) => (
        <label key={field}>
          <span>{field}</span>
          <input
            value={metadata[field] ?? ""}
            onChange={(event) =>
              onUpdateCardDetails(card.id, {
                decision: {
                  ...metadata,
                  [field]: event.target.value.trim() === "" ? null : Number(event.target.value)
                }
              })
            }
            inputMode="numeric"
          />
        </label>
      ))}
    </section>
  );
}

function CsvDataEditor({
  card,
  onUpdateCardDetails
}: {
  card: AtlasCard;
  onUpdateCardDetails: (
    cardId: string,
    patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">>
  ) => void;
}) {
  return (
    <section className="atlas-function-editor" aria-label="CSV data source">
      <header>
        <h3>CSV Data</h3>
        <p className="atlas-muted">Upload a small CSV to expose columns for data_ref properties.</p>
      </header>
      <input
        type="file"
        accept=".csv,text/csv"
        aria-label="Upload CSV data"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (!file) return;
          file.text().then((text) => {
            const parsed = parseAtlasCsv(text, file.name);
            onUpdateCardDetails(card.id, {
              data: {
                fileName: parsed.fileName,
                columns: parsed.columns,
                rowCount: parsed.rowCount,
                previewRows: parsed.previewRows
              }
            });
          });
        }}
      />
      {!card.data ? (
        <p className="atlas-muted">No CSV loaded.</p>
      ) : (
        <div className="atlas-csv-preview">
          <p>
            <strong>{card.data.fileName}</strong> · {card.data.rowCount} rows ·{" "}
            {card.data.columns.length} columns
          </p>
          <p className="atlas-muted">Columns: {card.data.columns.join(", ") || "none"}</p>
          {card.data.previewRows.length > 0 && (
            <table>
              <thead>
                <tr>
                  {card.data.columns.slice(0, 6).map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.data.previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {card.data?.columns.slice(0, 6).map((column) => (
                      <td key={column}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}

function IndexSetEditor({
  card,
  onUpdateCardDetails
}: {
  card: AtlasCard;
  onUpdateCardDetails: (
    cardId: string,
    patch: Partial<Pick<AtlasCard, "title" | "notes" | "decision" | "data">>
  ) => void;
}) {
  const indexSet = card.data?.indexSet;
  const [name, setName] = useState(indexSet?.name ?? "Weeks");
  const [elements, setElements] = useState(indexSet?.elements.join(", ") ?? "1, 2, 3, 4");

  useEffect(() => {
    setName(indexSet?.name ?? "Weeks");
    setElements(indexSet?.elements.join(", ") ?? "1, 2, 3, 4");
  }, [card.id, indexSet?.name, indexSet?.elements]);

  function save(next = createIndexSet(name, elements.split(","))) {
    onUpdateCardDetails(card.id, {
      data: {
        fileName: card.data?.fileName ?? `${next.name}.index`,
        columns: card.data?.columns ?? [],
        rowCount: card.data?.rowCount ?? 0,
        previewRows: card.data?.previewRows ?? [],
        indexSet: next
      }
    });
  }

  return (
    <section className="atlas-function-editor" aria-label="Index set metadata">
      <header>
        <h3>Index Set</h3>
        <p className="atlas-muted">Finite named elements for indexed properties and decisions.</p>
      </header>
      <label>
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        <span>Elements</span>
        <input
          value={elements}
          onChange={(event) => setElements(event.target.value)}
          placeholder="1, 2, 3, 4"
        />
      </label>
      <div className="atlas-inspector-actions">
        <button type="button" onClick={() => save()}>
          Save index set
        </button>
        <button
          type="button"
          onClick={() => {
            const weeks = createRangeIndexSet("Weeks", 1, 12);
            setName(weeks.name);
            setElements(weeks.elements.join(", "));
            save(weeks);
          }}
        >
          Weeks 1..12
        </button>
      </div>
      {indexSet && (
        <p className="atlas-muted">
          {indexSet.name}: {indexSet.elements.join(", ") || "no elements"}
        </p>
      )}
    </section>
  );
}

function formatEvaluationValue(entry: AtlasEvaluationEntry) {
  if (!entry.value) return "Unavailable";
  if (entry.value.kind === "number") return formatNumber(entry.value.value);
  const left = entry.value.left === null ? "?" : formatNumber(entry.value.left);
  const right = entry.value.right === null ? "?" : formatNumber(entry.value.right);
  const status =
    entry.value.satisfied === null ? "unknown" : entry.value.satisfied ? "satisfied" : "violated";
  return `${left} vs ${right} (${status})`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(4);
}

function ObjectiveEditor({
  card,
  cards,
  queries,
  onUpdateObjective,
  onAddObjectiveTerm,
  onUpdateObjectiveTerm,
  onRemoveObjectiveTerm,
  onMoveObjectiveTerm,
  onFocusObjectiveTerm
}: {
  card: AtlasCard;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  onUpdateObjective: (cardId: string, patch: Partial<Pick<AtlasObjectiveConfig, "direction">>) => void;
  onAddObjectiveTerm: (cardId: string, functionCardId?: string | null) => void;
  onUpdateObjectiveTerm: (
    cardId: string,
    termId: string,
    name: string,
    functionCardId: string | null
  ) => void;
  onRemoveObjectiveTerm: (cardId: string, termId: string) => void;
  onMoveObjectiveTerm: (cardId: string, termId: string, direction: "up" | "down") => void;
  onFocusObjectiveTerm: (termId: string | null) => void;
}) {
  const objective = createObjectiveConfig(card.objective);
  const functionCards = cards.filter((candidate) => candidate.type === "function");
  const preview = objectivePreview(card, cards);
  const dependencySummary = getObjectiveDependencySummary(card, cards, queries);

  return (
    <section className="atlas-function-editor" aria-label="Objective configuration">
      <header>
        <h3>Objective</h3>
        <p className="atlas-muted">Assemble ordered terms from Function cards.</p>
      </header>

      <label>
        <span>Direction</span>
        <select
          value={objective.direction}
          onChange={(event) =>
            onUpdateObjective(card.id, {
              direction: event.target.value === "maximize" ? "maximize" : "minimize"
            })
          }
          aria-label="Objective direction"
        >
          <option value="minimize">Minimize</option>
          <option value="maximize">Maximize</option>
        </select>
      </label>

      <div className="atlas-expression-preview" aria-label="Objective preview">
        <span>{preview.directionLabel}</span>
        <strong>{preview.functionNames.join(" + ") || "No terms yet"}</strong>
      </div>

      <button type="button" onClick={() => onAddObjectiveTerm(card.id, functionCards[0]?.id ?? null)}>
        Add term
      </button>

      <div className="atlas-objective-term-list">
        {objective.terms.length === 0 ? (
          <p className="atlas-muted">Add terms that reference TaggedSum Function cards.</p>
        ) : (
          objective.terms.map((term, index) => (
            <div key={term.id} className="atlas-objective-term-row">
              <input
                value={term.name}
                onFocus={() => onFocusObjectiveTerm(term.id)}
                onChange={(event) =>
                  onUpdateObjectiveTerm(card.id, term.id, event.target.value, term.functionCardId)
                }
                aria-label={`Objective term ${index + 1} name`}
              />
              <select
                value={term.functionCardId ?? ""}
                onFocus={() => onFocusObjectiveTerm(term.id)}
                onChange={(event) =>
                  onUpdateObjectiveTerm(
                    card.id,
                    term.id,
                    term.name,
                    event.target.value || null
                  )
                }
                aria-label={`Objective term ${index + 1} function`}
              >
                <option value="">Select function</option>
                {functionCards.map((functionCard) => (
                  <option key={functionCard.id} value={functionCard.id}>
                    {functionCard.title}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => onMoveObjectiveTerm(card.id, term.id, "up")}>
                Up
              </button>
              <button type="button" onClick={() => onMoveObjectiveTerm(card.id, term.id, "down")}>
                Down
              </button>
              <button type="button" onClick={() => onRemoveObjectiveTerm(card.id, term.id)}>
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <DependencyListSummary
        title="Objective dependencies"
        functionCards={dependencySummary.functionCards}
        participatingCards={dependencySummary.participatingCards}
        extra={`${dependencySummary.terms.length} active terms`}
      />
    </section>
  );
}

function ConstraintEditor({
  card,
  cards,
  queries,
  onUpdateConstraint
}: {
  card: AtlasCard;
  cards: AtlasCard[];
  queries: AtlasCardQuery[];
  onUpdateConstraint: (cardId: string, patch: Partial<AtlasConstraintConfig>) => void;
}) {
  const constraint = createConstraintConfig(card.constraint);
  const functionCards = cards.filter((candidate) => candidate.type === "function");
  const dependencySummary = getConstraintDependencySummary(card, cards, queries);

  return (
    <section className="atlas-function-editor" aria-label="Constraint configuration">
      <header>
        <h3>Constraint</h3>
        <p className="atlas-muted">Reference Function cards and constants without solving yet.</p>
      </header>

      <label>
        <span>Name</span>
        <input
          value={constraint.name}
          onChange={(event) => onUpdateConstraint(card.id, { name: event.target.value })}
          aria-label="Constraint name"
        />
      </label>

      <ConstraintExpressionEditor
        label="Left expression"
        expression={constraint.left}
        functionCards={functionCards}
        onChange={(left) => onUpdateConstraint(card.id, { left })}
      />

      <label>
        <span>Operator</span>
        <select
          value={constraint.operator}
          onChange={(event) =>
            onUpdateConstraint(card.id, {
              operator: event.target.value as AtlasConstraintConfig["operator"]
            })
          }
          aria-label="Constraint operator"
        >
          {ATLAS_CONSTRAINT_OPERATORS.map((operator) => (
            <option key={operator} value={operator}>
              {operator}
            </option>
          ))}
        </select>
      </label>

      <ConstraintExpressionEditor
        label="Right expression"
        expression={constraint.right}
        functionCards={functionCards}
        onChange={(right) => onUpdateConstraint(card.id, { right })}
      />

      <div className="atlas-expression-preview" aria-label="Constraint preview">
        <span>Preview</span>
        <strong>{constraintPreview(card, cards)}</strong>
      </div>

      <DependencyListSummary
        title="Constraint dependencies"
        functionCards={dependencySummary.functionCards}
        participatingCards={dependencySummary.participatingCards}
        extra={constraint.name}
      />
    </section>
  );
}

function ConstraintExpressionEditor({
  label,
  expression,
  functionCards,
  onChange
}: {
  label: string;
  expression: AtlasConstraintExpression;
  functionCards: AtlasCard[];
  onChange: (expression: AtlasConstraintExpression) => void;
}) {
  return (
    <div className="atlas-constraint-expression">
      <label>
        <span>{label}</span>
        <select
          value={expression.kind}
          onChange={(event) =>
            onChange(
              event.target.value === "function_ref"
                ? createFunctionConstraintExpression(functionCards[0]?.id ?? null)
                : createConstantConstraintExpression(0)
            )
          }
          aria-label={`${label} type`}
        >
          <option value="function_ref">Function card</option>
          <option value="constant">Numeric constant</option>
        </select>
      </label>
      {expression.kind === "function_ref" ? (
        <label>
          <span>Function</span>
          <select
            value={expression.functionCardId ?? ""}
            onChange={(event) => onChange(createFunctionConstraintExpression(event.target.value || null))}
            aria-label={`${label} function`}
          >
            <option value="">Select function</option>
            {functionCards.map((functionCard) => (
              <option key={functionCard.id} value={functionCard.id}>
                {functionCard.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <label>
          <span>Constant</span>
          <input
            value={String(expression.value)}
            onChange={(event) =>
              onChange(createConstantConstraintExpression(Number(event.target.value)))
            }
            aria-label={`${label} constant`}
          />
        </label>
      )}
    </div>
  );
}

function DependencyListSummary({
  title,
  functionCards,
  participatingCards,
  extra
}: {
  title: string;
  functionCards: AtlasCard[];
  participatingCards: AtlasCard[];
  extra: string;
}) {
  return (
    <section className="atlas-dependency-summary" aria-label={title}>
      <header>
        <h4>{title}</h4>
      </header>
      <dl>
        <div>
          <dt>Functions</dt>
          <dd>
            {functionCards.length === 0
              ? "None"
              : functionCards.map((functionCard) => functionCard.title).join(", ")}
          </dd>
        </div>
        <div>
          <dt>Participating cards</dt>
          <dd>
            {participatingCards.length === 0
              ? "None"
              : participatingCards.map((participant) => participant.title).join(", ")}
          </dd>
        </div>
        <div>
          <dt>Summary</dt>
          <dd>{extra}</dd>
        </div>
      </dl>
    </section>
  );
}

function propertyToDraft(property: AtlasProperty): PropertyDraft {
  return {
    name: property.name,
    kind: property.kind,
    value:
      property.value === null
        ? ""
        : typeof property.value === "object"
          ? `${property.value.dataCardId}.${property.value.column}`
          : String(property.value),
    indexSetId: property.indexSetId ?? "",
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
    indexSetId: optionalText(draft.indexSetId),
    unit: optionalText(draft.unit),
    notes: optionalText(draft.notes)
  };
}

function normalizePropertyDraftValue(draft: PropertyDraft): AtlasProperty["value"] {
  const value = draft.value.trim();
  if (!value) return "";
  if (draft.kind === "data_ref") {
    const separator = value.indexOf(".");
    return separator > 0
      ? { dataCardId: value.slice(0, separator), column: value.slice(separator + 1) }
      : value;
  }
  if (draft.kind !== "constant") return value;

  const numericValue = Number(value);
  return Number.isFinite(numericValue) && value !== "" ? numericValue : value;
}

function moveLinearTerm(terms: AtlasLinearTermDraft[], index: number, delta: number) {
  const next = [...terms];
  const [term] = next.splice(index, 1);
  if (!term) return terms;
  next.splice(index + delta, 0, term);
  return next;
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
