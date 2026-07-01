import type { ReactNode } from "react";
import type { AtlasPanelRegion } from "../panels/panelRegistry";

export function PanelHost({
  region,
  children
}: {
  region: AtlasPanelRegion;
  children: ReactNode;
}) {
  return (
    <section data-region={region} className="atlas-panel-host">
      {children}
    </section>
  );
}
