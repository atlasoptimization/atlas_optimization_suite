import {
  EMPTY_ATLAS_STATE,
  addAtlasCard,
  addAtlasCardFromTemplate,
  addAtlasProperty,
  addAtlasTag,
  deleteAtlasCard,
  deleteAtlasProperty,
  deleteAtlasTag,
  moveAtlasCard,
  updateAtlasCardDetails,
  updateAtlasProperty,
  updateAtlasTag
} from "./cards";
import { addAtlasGroup, deleteAtlasGroup, updateAtlasGroup } from "./groups";
import { updateTaggedSumConfig } from "./functions";
import { attachAtlasModule, deleteAtlasModule, updateAtlasModule } from "./modules";
import { updateConstraintConfig } from "./constraints";
import {
  addObjectiveTerm,
  moveObjectiveTerm,
  removeObjectiveTerm,
  updateObjectiveConfig,
  updateObjectiveTerm
} from "./objectives";
import {
  addAtlasQuery,
  addAtlasQueryCondition,
  deleteAtlasQuery,
  deleteAtlasQueryCondition,
  duplicateAtlasQuery,
  updateAtlasQuery,
  updateAtlasQueryCondition
} from "./queries";
import type { AtlasAction, AtlasWorkbenchState } from "./types";

export function atlasReducer(
  state: AtlasWorkbenchState,
  action: AtlasAction
): AtlasWorkbenchState {
  switch (action.type) {
    case "card.create":
      return addAtlasCard(state, action.cardType);
    case "card.createFromTemplate":
      return addAtlasCardFromTemplate(state, action.templateId);
    case "card.select":
      return {
        ...state,
        selectedCardId: action.cardId,
        selectedGroupId: null,
        selectedQueryId: null
      };
    case "card.update":
      return updateAtlasCardDetails(state, action.cardId, action.patch);
    case "card.move":
      return moveAtlasCard(state, action.cardId, action.position);
    case "card.delete":
      return deleteAtlasCard(state, action.cardId);
    case "group.create":
      return addAtlasGroup(state);
    case "group.select":
      return {
        ...state,
        selectedCardId: null,
        selectedGroupId: action.groupId,
        selectedQueryId: null
      };
    case "group.update":
      return updateAtlasGroup(state, action.groupId, action.patch);
    case "group.delete":
      return deleteAtlasGroup(state, action.groupId);
    case "query.create":
      return addAtlasQuery(state);
    case "query.select":
      return {
        ...state,
        selectedCardId: null,
        selectedGroupId: null,
        selectedQueryId: action.queryId
      };
    case "query.update":
      return updateAtlasQuery(state, action.queryId, action.patch);
    case "query.duplicate":
      return duplicateAtlasQuery(state, action.queryId);
    case "query.delete":
      return deleteAtlasQuery(state, action.queryId);
    case "query.condition.add":
      return addAtlasQueryCondition(state, action.queryId, action.list, action.key, action.value);
    case "query.condition.update":
      return updateAtlasQueryCondition(
        state,
        action.queryId,
        action.list,
        action.conditionId,
        action.key,
        action.value
      );
    case "query.condition.delete":
      return deleteAtlasQueryCondition(state, action.queryId, action.list, action.conditionId);
    case "tag.add":
      return addAtlasTag(state, action.cardId, action.key, action.value);
    case "tag.update":
      return updateAtlasTag(state, action.cardId, action.tagId, action.key, action.value);
    case "tag.delete":
      return deleteAtlasTag(state, action.cardId, action.tagId);
    case "property.add":
      return addAtlasProperty(state, action.cardId, action.name, action.kind, action.value, {
        indexSetId: action.indexSetId,
        unit: action.unit,
        notes: action.notes
      });
    case "property.update":
      return updateAtlasProperty(
        state,
        action.cardId,
        action.propertyId,
        action.name,
        action.kind,
        action.value,
        {
          indexSetId: action.indexSetId,
          unit: action.unit,
          notes: action.notes
        }
      );
    case "property.delete":
      return deleteAtlasProperty(state, action.cardId, action.propertyId);
    case "module.attach":
      return attachAtlasModule(state, action.cardId, action.kind, {
        label: action.label,
        value: action.value,
        position: action.position
      });
    case "module.update":
      return updateAtlasModule(state, action.cardId, action.moduleId, action.patch);
    case "module.delete":
      return deleteAtlasModule(state, action.cardId, action.moduleId);
    case "function.taggedSum.update":
      return updateTaggedSumConfig(state, action.cardId, action.patch);
    case "objective.update":
      return updateObjectiveConfig(state, action.cardId, action.patch);
    case "objective.term.add":
      return addObjectiveTerm(state, action.cardId, action.functionCardId ?? null);
    case "objective.term.update":
      return updateObjectiveTerm(
        state,
        action.cardId,
        action.termId,
        action.name,
        action.functionCardId
      );
    case "objective.term.remove":
      return removeObjectiveTerm(state, action.cardId, action.termId);
    case "objective.term.move":
      return moveObjectiveTerm(state, action.cardId, action.termId, action.direction);
    case "constraint.update":
      return updateConstraintConfig(state, action.cardId, action.patch);
    case "workbench.clear":
      return EMPTY_ATLAS_STATE;
    case "workbench.load":
      return action.state;
  }
}
