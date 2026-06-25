import {
  EMPTY_ATLAS_STATE,
  addAtlasCard,
  deleteAtlasCard,
  moveAtlasCard
} from "./cards";
import type { AtlasAction, AtlasWorkbenchState } from "./types";

export function atlasReducer(
  state: AtlasWorkbenchState,
  action: AtlasAction
): AtlasWorkbenchState {
  switch (action.type) {
    case "card.create":
      return addAtlasCard(state, action.cardType);
    case "card.select":
      return {
        ...state,
        selectedCardId: action.cardId
      };
    case "card.move":
      return moveAtlasCard(state, action.cardId, action.position);
    case "card.delete":
      return deleteAtlasCard(state, action.cardId);
    case "workbench.clear":
      return EMPTY_ATLAS_STATE;
    case "workbench.load":
      return action.state;
  }
}
