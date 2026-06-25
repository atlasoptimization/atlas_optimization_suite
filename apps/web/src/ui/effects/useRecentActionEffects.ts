import { useEffect, useState } from "react";
import type { DeckAction } from "../../core/types/action";
import type { RecentActionEffects } from "../../core/types/effects";
import type { SessionState } from "../../core/types/session";

function isPlaceLikeAction(action: DeckAction | null) {
  return action?.type === "card.place" || action?.type === "piles.drawDomain";
}

function isStrictModeUnsupportedAction(action: DeckAction | null) {
  if (!action) return false;
  return action.type.startsWith("card.") || action.type.startsWith("note.") || action.type.startsWith("piles.");
}

export function useRecentActionEffects(
  action: DeckAction | null,
  session: SessionState,
  enabled: boolean
): RecentActionEffects {
  const [highlightedInstanceId, setHighlightedInstanceId] = useState<string | null>(null);
  const [strictWarning, setStrictWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !isPlaceLikeAction(action)) return;

    const instanceId = session.selectedInstanceId;
    if (!instanceId) return;

    setHighlightedInstanceId(instanceId);
    const timeout = window.setTimeout(() => setHighlightedInstanceId(null), 1100);

    return () => window.clearTimeout(timeout);
  }, [action, enabled, session.selectedInstanceId]);

  useEffect(() => {
    if (!enabled || session.modeEnforcement !== "strict" || !isStrictModeUnsupportedAction(action)) {
      return;
    }

    setStrictWarning("Strict mode enforcement is not implemented yet.");
    const timeout = window.setTimeout(() => setStrictWarning(null), 1300);

    return () => window.clearTimeout(timeout);
  }, [action, enabled, session.modeEnforcement]);

  if (!enabled) {
    return {
      highlightedInstanceId: null,
      strictWarning: null
    };
  }

  return {
    highlightedInstanceId,
    strictWarning
  };
}
