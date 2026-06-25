import type { SessionState } from "./session";
import type { DomainName } from "./domain";
import type { DeckCard } from "./card";

export type DomainVectorValue = "A" | "F" | "C" | "R";

export type ModeEnforcement = "free" | "guided" | "strict";

export type ModeRecommendation = {
  id?: string;
  modeId?: string;
  kind?: "setup" | "core" | "ending" | "reflection";
  label: string;
  description: string;
  mechanical?: string;
  interpretation?: string;
  targetDomains?: string[];
  disabled?: boolean;
  reasonDisabled?: string;
  actionKind:
    | "choose-candidates"
    | "draw-hidden"
    | "draw-random"
    | "draw-specific"
    | "choose-filtered-candidates"
    | "place-cards"
    | "place-domain-masters"
    | "inspect-pile"
    | "create-note"
    | "start-timer"
    | "script-step"
    | "complete";
  scriptId?: string;
  stepIndex?: number;
  domain?: string;
  domains?: string[];
  cardId?: string;
  cards?: { cardId: string; domain: string; modeRole?: string }[];
  count?: number;
  drawMode?: "random-1" | "random-n" | "choose-1-from-n" | "secret-1" | "secret-n";
  subset?: string;
  progressUpdates?: Record<string, unknown>;
  timerPreset?: {
    label: string;
    durationMs: number;
    messageOnFinish: string;
    actionOnFinish?: import("./session").TimerActionOnFinish;
    autoRestart?: boolean;
  };
};

export type GameMode = {
  id: string;
  name: string;
  purpose: string;
  shortDescription?: string;
  whenToUse?: string;
  procedureSummary?: string;
  commentary?: string;
  category?: string;
  automationStatus?: "implemented" | "partial" | "description-only";
  domainVector: Record<string, DomainVectorValue>;
  description: string;
  setupInstructions: string[];
  nextStepHint?: (state: SessionState) => string;
  recommendedAction?: (state: SessionState, cards?: DeckCard[]) => ModeRecommendation | null;
  timerPreset?: {
    label: string;
    durationMs: number;
    messageOnFinish: string;
    actionOnFinish?: import("./session").TimerActionOnFinish;
    autoRestart?: boolean;
  };
};

export type CustomGameMode = Omit<GameMode, "nextStepHint"> & {
  id: `custom-mode-${string}`;
  isCustom: true;
  domainVector: Record<DomainName, DomainVectorValue>;
  procedure: string;
  notes?: string;
};
