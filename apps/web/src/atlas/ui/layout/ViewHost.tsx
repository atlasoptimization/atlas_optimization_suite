import type { ReactNode } from "react";
import type { AtlasWorkbenchView } from "../views/AtlasMultiView";

export function ViewHost({
  activeView,
  views
}: {
  activeView: AtlasWorkbenchView;
  views: Partial<Record<AtlasWorkbenchView, ReactNode>>;
}) {
  return <>{views[activeView] ?? null}</>;
}
