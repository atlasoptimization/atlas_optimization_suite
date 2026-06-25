import type { DeckAction } from "../core/types/action";

export type ModeGuidedPileSession = {
  modeId: string;
  domain: string;
  stepId: string;
  cardsDrawn: string[];
  progressUpdates?: Record<string, unknown>;
};

export function recordGuidedPileDraw(
  session: ModeGuidedPileSession | null,
  action: DeckAction
): ModeGuidedPileSession | null {
  if (!session || action.type !== "pile.drawSpecificCard" || action.domain !== session.domain) {
    return session;
  }

  return {
    ...session,
    cardsDrawn: session.cardsDrawn.includes(action.cardId)
      ? session.cardsDrawn
      : [...session.cardsDrawn, action.cardId]
  };
}

export function getGuidedPileCompletionPatch(
  session: ModeGuidedPileSession | null,
  forceComplete = false
): { modeId: string; patch: Record<string, unknown> } | null {
  if (!session?.progressUpdates) return null;
  if (!forceComplete && session.cardsDrawn.length === 0) return null;

  return {
    modeId: session.modeId,
    patch: session.progressUpdates
  };
}
