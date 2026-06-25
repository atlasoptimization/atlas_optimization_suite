import type { RecentActionEffects } from "../../core/types/effects";

type EffectLayerProps = {
  effects: RecentActionEffects;
};

export function EffectLayer({ effects }: EffectLayerProps) {
  if (!effects.strictWarning) return null;

  return (
    <div className="effect-layer" aria-live="polite">
      <div className="strict-warning-flash">{effects.strictWarning}</div>
    </div>
  );
}
