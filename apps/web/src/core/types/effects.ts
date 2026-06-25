export type VisualEffectKind = "new-card" | "strict-warning";

export type RecentActionEffects = {
  highlightedInstanceId: string | null;
  strictWarning: string | null;
};

export type VisualEffectEvent = {
  id: string;
  kind: VisualEffectKind;
  message?: string;
};
