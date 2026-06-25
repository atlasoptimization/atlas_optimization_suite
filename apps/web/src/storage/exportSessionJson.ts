import type { SessionExportJson } from "../core/types/sessionExport";
import type { SessionState } from "../core/types/session";

export function filenamePart(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return normalized || "untitled-session";
}

export function createSessionExport(session: SessionState): SessionExportJson {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    app: "data-science-deck-app",
    session
  };
}

export function createSessionExportJson(session: SessionState): string {
  return JSON.stringify(createSessionExport(session), null, 2);
}

export function createSessionExportFilename(session: SessionState): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${filenamePart(session.title)}-${date}.json`;
}

export function downloadSessionJson(session: SessionState): void {
  const blob = new Blob([createSessionExportJson(session)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = createSessionExportFilename(session);
  link.click();
  URL.revokeObjectURL(url);
}
