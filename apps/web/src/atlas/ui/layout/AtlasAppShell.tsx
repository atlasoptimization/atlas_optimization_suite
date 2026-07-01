import type { ReactNode } from "react";

export function AtlasAppShell({
  toolbar,
  left,
  center,
  right,
  overlays
}: {
  toolbar: ReactNode;
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  overlays?: ReactNode;
}) {
  return (
    <div className="atlas-app-shell">
      {toolbar}
      <main className="atlas-main-layout" aria-label="Atlas Optimization Suite workbench">
        {left}
        {center}
        {right}
      </main>
      {overlays}
    </div>
  );
}
