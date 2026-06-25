import type { GameMode, ModeRecommendation } from "../core/types/mode";
import type { SessionState } from "../core/types/session";
import { DEFAULT_MODE_ID } from "./constants";

const MODE_INTERPRETATION: Record<string, string> = {
  standard: "Compare several candidates and keep the one that best advances the model.",
  "true-tarot": "Keep the card hidden first so placement can create surprise before interpretation.",
  "true-bayes": "Move quickly; let the short timer force a prior-like first judgement.",
  abstraction: "Turn the topic y into an Aspect expression x(y).",
  "source-review": "Use Source to anchor the material, then Aspect to ask better questions of it.",
  "model-archaeology": "Reconstruct how an older model came to be built.",
  "model-lies": "Use this step to justify or accuse the model.",
  "model-dies": "Find where the model breaks, then mark the damaged assumptions.",
  "exam-clock": "Keep the model decision under pressure and prepare to grade it.",
  "midnight-calibration": "Separate interpretation from background pressure without biasing domains.",
  "void-cartography": "Map absence through Void shape and Aspect modifier prompts.",
  "shadows-vacuum": "Anchor the source, then use Void to expose absence and boundary.",
  "everything-not": "Build model supports first, then let Void challenge what they exclude.",
  "ablation-study": "Remove or mark assumptions until the model fails.",
  "entropy-auction": "Let competing domains argue for which card matters most.",
  "scripted-demo": "Follow the curated example one action at a time."
};

export function enrichModeRecommendation({
  mode,
  recommendation,
  session,
  disabledReason
}: {
  mode: GameMode | null;
  recommendation: ModeRecommendation | null;
  session: SessionState;
  disabledReason?: string | null;
}): ModeRecommendation | null {
  if (!recommendation) return null;
  const modeId = mode?.id ?? session.activeModeId ?? DEFAULT_MODE_ID;
  const targetDomains = recommendation.targetDomains ??
    recommendation.domains ??
    (recommendation.domain ? [recommendation.domain] : []);

  return {
    ...recommendation,
    id: recommendation.id ?? `${modeId}:${recommendation.actionKind}:${recommendation.label}`,
    modeId,
    kind: recommendation.kind ?? inferStepKind(recommendation),
    mechanical: recommendation.mechanical ?? inferMechanical(recommendation),
    interpretation:
      recommendation.interpretation ??
      inferInterpretation(modeId, recommendation),
    targetDomains,
    disabled: recommendation.disabled ?? Boolean(disabledReason),
    reasonDisabled: recommendation.reasonDisabled ?? disabledReason ?? undefined
  };
}

function inferStepKind(recommendation: ModeRecommendation): NonNullable<ModeRecommendation["kind"]> {
  if (
    recommendation.actionKind === "place-cards" ||
    recommendation.actionKind === "place-domain-masters" ||
    recommendation.actionKind === "create-note" ||
    recommendation.actionKind === "start-timer" ||
    recommendation.actionKind === "script-step"
  ) {
    return "setup";
  }
  if (recommendation.actionKind === "complete") return "ending";
  return "core";
}

function inferMechanical(recommendation: ModeRecommendation) {
  if (recommendation.reasonDisabled) return recommendation.reasonDisabled;
  if (recommendation.mechanical) return recommendation.mechanical;
  if (recommendation.actionKind === "choose-candidates") {
    const count = recommendation.count ?? 5;
    return recommendation.domain
      ? `Draw ${count} from ${recommendation.domain}, choose 1`
      : `Draw ${count}, choose 1`;
  }
  if (recommendation.actionKind === "choose-filtered-candidates") {
    return `Draw ${recommendation.cards?.length ?? recommendation.count ?? 0} candidates, choose 1`;
  }
  if (recommendation.actionKind === "inspect-pile") {
    return recommendation.domain
      ? `Choose freely from ${recommendation.domain} pile`
      : "Choose freely from pile";
  }
  if (recommendation.actionKind === "draw-random") {
    return recommendation.domain ? `Draw 1 from ${recommendation.domain}` : "Draw 1 card";
  }
  if (recommendation.actionKind === "draw-hidden") {
    return recommendation.domain ? `Draw 1 hidden from ${recommendation.domain}` : "Draw 1 hidden card";
  }
  if (recommendation.actionKind === "draw-specific") {
    return recommendation.domain
      ? `Place specific ${recommendation.domain} card`
      : "Place specific card";
  }
  if (recommendation.actionKind === "place-domain-masters") {
    return recommendation.domains?.length === 1
      ? `Place ${recommendation.domains[0]} domain master card`
      : "Place domain master cards";
  }
  if (recommendation.actionKind === "place-cards") return "Place setup cards";
  if (recommendation.actionKind === "create-note") return recommendation.label;
  if (recommendation.actionKind === "start-timer") return recommendation.label;
  if (recommendation.actionKind === "script-step") return recommendation.label;
  if (recommendation.actionKind === "complete") return recommendation.description;
  return recommendation.label;
}

function inferInterpretation(modeId: string, recommendation: ModeRecommendation) {
  if (recommendation.interpretation) return recommendation.interpretation;
  if (MODE_INTERPRETATION[modeId]) return MODE_INTERPRETATION[modeId];
  if (recommendation.actionKind === "inspect-pile") {
    return "Choose cards deliberately; manual judgement is part of this step.";
  }
  if (recommendation.actionKind === "complete") return "Pause and record what the session now implies.";
  return recommendation.description;
}
